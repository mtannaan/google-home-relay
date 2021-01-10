import {RequestHandler} from 'express';

// https://qiita.com/shuhei/items/a61b4324fd5dbc1af79b
const cyan = '\u001b[36m';
// const white = '\u001b[37m';
const reset = '\u001b[0m';

export const dumpResponseMW: RequestHandler = (req, res, next) => {
  const sock = req.socket;
  const write = sock.write.bind(sock);

  // write(buffer: Uint8Array | string, cb?: (err?: Error) => void): boolean;
  // write(str: Uint8Array | string, encoding?: BufferEncoding, cb?: (err?: Error) => void): boolean;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sock.write = (data: Uint8Array | string, ...args: any[]) => {
    console.log(cyan + data + reset);
    return write(data, ...args);
  };
  next();
};
