const childProcess: { execFile: typeof execFile } = jest.genMockFromModule('child_process');

const execFile = (path: string, args: string[], thing: any, callback: Function) => {
  callback();
};

childProcess.execFile = execFile;

module.exports = childProcess;
