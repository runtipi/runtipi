const childProcess: { execFile: typeof execFile } = jest.genMockFromModule('child_process');

const execFile = (_path: string, _args: string[], _thing: unknown, callback: () => void) => {
  callback();
};

childProcess.execFile = execFile;

module.exports = childProcess;
