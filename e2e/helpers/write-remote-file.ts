import { Client } from 'ssh2';

export const execRemoteCommand = async (command: string): Promise<void> => {
  return new Promise((resolve) => {
    const conn = new Client();

    conn.connect({
      host: process.env.SERVER_IP,
      port: 22,
      username: 'root',
      privateKey: atob(process.env.SSH_PRIVATE_KEY as string),
    });

    conn.on('ready', () => {
      conn.exec(command, (err, stream) => {
        if (err) throw err;

        stream
          .on('close', () => {
            conn.end();
            resolve();
          })
          .on('data', (data: Buffer) => {
            console.log('STDOUT:', data.toString());
          })
          .stderr.on('data', (data: Buffer) => {
            console.log('STDERR:', data.toString());
          });
      });
    });
  });
};
