import portUsed, { TcpPortUsedOptions } from 'tcp-port-used';

const internalIp: { check: typeof portUsed.check } = jest.genMockFromModule('tcp-port-used');

internalIp.check = async (_: number | TcpPortUsedOptions, __?: string | undefined) => {
  return true;
};

module.exports = internalIp;
