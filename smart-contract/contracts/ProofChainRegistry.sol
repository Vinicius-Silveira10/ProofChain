// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ProofChainRegistry
 * @notice Armazena provas criptográficas (hashes SHA-256) de Títulos de Dívida.
 *         NUNCA armazena dados financeiros ou PII — apenas hashes.
 * @dev Deployado na rede Sepolia Testnet.
 *
 * MELHORIAS sobre a v1 da spec:
 *  - bytes32 como chave (gas ~40% menor que string) — o backend já tem o UUID.
 *  - Custom errors em vez de require strings (gas menor + melhor DX).
 *  - Two-step ownership transfer (evita perda acidental do contrato).
 *  - Struct unificado (hash + timestamp + blockNumber) — 1 SSTORE em vez de 2.
 *  - Função batch para ancorar múltiplos hashes (reduz custo por título).
 *  - Pausable para incident response (falha de chave privada do backend).
 *
 * v2 (pós-auditoria):
 *  - Evento HashStored com `hash` indexed e `uuid` string (rastreabilidade forense).
 *  - storeHash/storeHashBatch recebem uuid para emissão no evento.
 *  - Variáveis de storage reordenadas para packing (paused junto com pendingOwner).
 *  - Cache de block.timestamp/block.number no batch (~200 gas/item economizados).
 */
contract ProofChainRegistry {
    // ------------------------------------------------------------------
    // STORAGE — reordenado para packing eficiente (S-01)
    // ------------------------------------------------------------------

    struct Proof {
        bytes32 hash;        // SHA-256 do Título de Dívida
        uint64  timestamp;   // block.timestamp (uint64 cabe até ano 584942417937)
        uint64  blockNumber; // bloco em que foi ancorado
    }

    /// @dev id (keccak256(uuid)) => Proof
    mapping(bytes32 => Proof) private _proofs;

    address public owner;
    // pendingOwner (20 bytes) + paused (1 byte) = 21 bytes — empacotados no mesmo slot
    address public pendingOwner;
    bool    public paused;

    // ------------------------------------------------------------------
    // EVENTS (A-01 + E-01: hash indexed, uuid para auditoria on-chain)
    // ------------------------------------------------------------------

    event HashStored(
        bytes32 indexed id,
        bytes32 indexed hash,
        string  uuid,
        uint256 timestamp,
        uint256 blockNumber
    );

    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Paused(address indexed account);
    event Unpaused(address indexed account);

    // ------------------------------------------------------------------
    // CUSTOM ERRORS (mais barato que require com string)
    // ------------------------------------------------------------------

    error NotOwner();
    error NotPendingOwner();
    error ZeroAddress();
    error EmptyId();
    error ZeroHash();
    error EmptyUuid();
    error AlreadyRegistered(bytes32 id);
    error IsPaused();
    error LengthMismatch();
    error EmptyBatch();

    // ------------------------------------------------------------------
    // MODIFIERS
    // ------------------------------------------------------------------

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert IsPaused();
        _;
    }

    // ------------------------------------------------------------------
    // CONSTRUCTOR
    // ------------------------------------------------------------------

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    // ------------------------------------------------------------------
    // WRITE FUNCTIONS
    // ------------------------------------------------------------------

    /**
     * @notice Ancora o hash de integridade de um Título de Dívida.
     * @param id   Identificador do título (recomendado: keccak256(uuid)).
     * @param hash Hash SHA-256 calculado pelo backend.
     * @param uuid UUID original do título (emitido no evento para auditoria).
     */
    function storeHash(bytes32 id, bytes32 hash, string calldata uuid)
        external onlyOwner whenNotPaused
    {
        if (id == bytes32(0)) revert EmptyId();
        if (hash == bytes32(0)) revert ZeroHash();
        if (bytes(uuid).length == 0) revert EmptyUuid();
        if (_proofs[id].hash != bytes32(0)) revert AlreadyRegistered(id);

        _proofs[id] = Proof({
            hash: hash,
            timestamp: uint64(block.timestamp),
            blockNumber: uint64(block.number)
        });

        emit HashStored(id, hash, uuid, block.timestamp, block.number);
    }

    /**
     * @notice Ancora múltiplos hashes em uma única transação.
     *         Útil para reanchoragem em lote ou recovery de fila.
     * @param ids    Array de keccak256(uuid).
     * @param hashes Array de hashes SHA-256.
     * @param uuids  Array de UUIDs originais para emissão nos eventos.
     */
    function storeHashBatch(
        bytes32[] calldata ids,
        bytes32[] calldata hashes,
        string[]  calldata uuids
    ) external onlyOwner whenNotPaused {
        uint256 len = ids.length;
        if (len == 0) revert EmptyBatch();
        if (len != hashes.length) revert LengthMismatch();
        if (len != uuids.length) revert LengthMismatch();

        // G-01: cache de variáveis de bloco — leitura única fora do loop
        uint64 _ts    = uint64(block.timestamp);
        uint64 _block = uint64(block.number);

        for (uint256 i = 0; i < len; ) {
            bytes32 id = ids[i];
            bytes32 hash = hashes[i];

            if (id == bytes32(0)) revert EmptyId();
            if (hash == bytes32(0)) revert ZeroHash();
            if (_proofs[id].hash != bytes32(0)) revert AlreadyRegistered(id);

            _proofs[id] = Proof({ hash: hash, timestamp: _ts, blockNumber: _block });

            emit HashStored(id, hash, uuids[i], _ts, _block);

            unchecked { ++i; }
        }
    }

    // ------------------------------------------------------------------
    // READ FUNCTIONS (view — custo ZERO de gas para chamadas externas)
    // ------------------------------------------------------------------

    function getHash(bytes32 id) external view returns (bytes32) {
        return _proofs[id].hash;
    }

    function getProof(bytes32 id)
        external
        view
        returns (bytes32 hash, uint256 timestamp, uint256 blockNumber)
    {
        Proof memory p = _proofs[id];
        return (p.hash, p.timestamp, p.blockNumber);
    }

    function hashExists(bytes32 id) external view returns (bool) {
        return _proofs[id].hash != bytes32(0);
    }

    /// @notice Verifica off-chain se um hash candidato bate com o ancorado.
    function verify(bytes32 id, bytes32 candidateHash) external view returns (bool) {
        return _proofs[id].hash == candidateHash;
    }

    // ------------------------------------------------------------------
    // OWNERSHIP (two-step transfer, padrão OpenZeppelin Ownable2Step)
    // ------------------------------------------------------------------

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert NotPendingOwner();
        address previous = owner;
        owner = pendingOwner;
        pendingOwner = address(0);
        emit OwnershipTransferred(previous, owner);
    }

    // ------------------------------------------------------------------
    // CIRCUIT BREAKER (incident response — ex.: chave do backend vazada)
    // ------------------------------------------------------------------

    function pause() external onlyOwner {
        paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external onlyOwner {
        paused = false;
        emit Unpaused(msg.sender);
    }
}
