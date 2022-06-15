const childProcess: { execFile: typeof execFile } = jest.genMockFromModule('child_process');

const execFile = (_path: string, _args: string[], _thing: any, callback: Function) => {
  callback();
};

childProcess.execFile = execFile;

module.exports = childProcess;
