// Minimal ERC-7786 gateway ABI: only what the relayer touches — encode deliver() on the destination
// gateway and decode MessageSent from the source gateway.
export const GATEWAY_ABI = [
  {
    type: 'function',
    name: 'deliver',
    inputs: [
      { name: 'recipient', type: 'address', internalType: 'address' },
      { name: 'receiveId', type: 'bytes32', internalType: 'bytes32' },
      { name: 'sender', type: 'bytes', internalType: 'bytes' },
      { name: 'payload', type: 'bytes', internalType: 'bytes' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    type: 'event',
    name: 'MessageSent',
    inputs: [
      { name: 'sendId', type: 'bytes32', indexed: true, internalType: 'bytes32' },
      { name: 'sender', type: 'bytes', indexed: false, internalType: 'bytes' },
      { name: 'recipient', type: 'bytes', indexed: false, internalType: 'bytes' },
      { name: 'payload', type: 'bytes', indexed: false, internalType: 'bytes' },
      { name: 'value', type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'attributes', type: 'bytes[]', indexed: false, internalType: 'bytes[]' }
    ],
    anonymous: false
  }
] as const;
