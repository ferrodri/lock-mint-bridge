export const LOCK_BRIDGE_ABI = [
  {
    type: 'constructor',
    inputs: [
      { name: 'token_', type: 'address', internalType: 'contract IERC20' },
      {
        name: 'links',
        type: 'tuple[]',
        internalType: 'struct CrosschainLinked.Link[]',
        components: [
          { name: 'gateway', type: 'address', internalType: 'address' },
          { name: 'counterpart', type: 'bytes', internalType: 'bytes' }
        ]
      }
    ],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'crosschainTransfer',
    inputs: [
      { name: 'to', type: 'bytes', internalType: 'bytes' },
      { name: 'amount', type: 'uint256', internalType: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bytes32', internalType: 'bytes32' }],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'getLink',
    inputs: [{ name: 'chain', type: 'bytes', internalType: 'bytes' }],
    outputs: [
      { name: 'gateway', type: 'address', internalType: 'address' },
      { name: 'counterpart', type: 'bytes', internalType: 'bytes' }
    ],
    stateMutability: 'view'
  },
  {
    type: 'function',
    name: 'receiveMessage',
    inputs: [
      { name: 'receiveId', type: 'bytes32', internalType: 'bytes32' },
      { name: 'sender', type: 'bytes', internalType: 'bytes' },
      { name: 'payload', type: 'bytes', internalType: 'bytes' }
    ],
    outputs: [{ name: '', type: 'bytes4', internalType: 'bytes4' }],
    stateMutability: 'payable'
  },
  {
    type: 'function',
    name: 'token',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'contract IERC20' }],
    stateMutability: 'view'
  },
  {
    type: 'event',
    name: 'CrosschainFungibleTransferReceived',
    inputs: [
      { name: 'receiveId', type: 'bytes32', indexed: true, internalType: 'bytes32' },
      { name: 'from', type: 'bytes', indexed: false, internalType: 'bytes' },
      { name: 'to', type: 'address', indexed: true, internalType: 'address' },
      { name: 'amount', type: 'uint256', indexed: false, internalType: 'uint256' }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'CrosschainFungibleTransferSent',
    inputs: [
      { name: 'sendId', type: 'bytes32', indexed: true, internalType: 'bytes32' },
      { name: 'from', type: 'address', indexed: true, internalType: 'address' },
      { name: 'to', type: 'bytes', indexed: false, internalType: 'bytes' },
      { name: 'amount', type: 'uint256', indexed: false, internalType: 'uint256' }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'LinkRegistered',
    inputs: [
      { name: 'gateway', type: 'address', indexed: false, internalType: 'address' },
      { name: 'counterpart', type: 'bytes', indexed: false, internalType: 'bytes' }
    ],
    anonymous: false
  },
  {
    type: 'error',
    name: 'ERC7786RecipientUnauthorizedGateway',
    inputs: [
      { name: 'gateway', type: 'address', internalType: 'address' },
      { name: 'sender', type: 'bytes', internalType: 'bytes' }
    ]
  },
  {
    type: 'error',
    name: 'InteroperableAddressEmptyReferenceAndAddress',
    inputs: []
  },
  {
    type: 'error',
    name: 'InteroperableAddressParsingError',
    inputs: [{ name: '', type: 'bytes', internalType: 'bytes' }]
  },
  {
    type: 'error',
    name: 'LinkAlreadyRegistered',
    inputs: [{ name: 'chain', type: 'bytes', internalType: 'bytes' }]
  },
  {
    type: 'error',
    name: 'SafeCastOverflowedUintDowncast',
    inputs: [
      { name: 'bits', type: 'uint8', internalType: 'uint8' },
      { name: 'value', type: 'uint256', internalType: 'uint256' }
    ]
  },
  {
    type: 'error',
    name: 'SafeERC20FailedOperation',
    inputs: [{ name: 'token', type: 'address', internalType: 'address' }]
  }
] as const;
