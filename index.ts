import cors from 'cors';
import { config } from 'dotenv-safe';
import express, { Request, Response } from 'express';
import forge from 'node-forge';

config();

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

console.log(process.env.PORT);

app.listen(parseInt(process.env.PORT!) || 4000, '0.0.0.0', () => {});

type TotpRequestBody = {
  twoFaSecret: string;
  twoFaUnixT0: number;
  currentTimeInUnix: number;
  asArrayOfDigits?: boolean;
  applicationPassword: string;
};

type TotpExpressApiRequest = Omit<Request, 'body'> & {
  body: TotpRequestBody;
};

type TotpResponseBody =
  | { errors: { message: string }[] }
  | { password: number[] | number };

app.get('/', () => {});

app.post('/', (req: TotpExpressApiRequest, res: Response<TotpResponseBody>) => {
  if (req.body.applicationPassword === process.env.PASSWORD) {
    const md = forge.hmac.create();

    const currentTimeStep = Math.floor(
      (req.body.twoFaUnixT0 - req.body.currentTimeInUnix) / 30,
    );
    const currentTimeStep8Bit = currentTimeStep.toString(2).padStart(8, '0');

    md.start('sha1', req.body.twoFaSecret);
    md.update(currentTimeStep8Bit);
    const hmacDigest = md.digest();

    const hmacDigestCharArray = hmacDigest.toHex().split('');

    const hmacDigestHexArray: string[] = [];
    for (let i = 0; i < hmacDigestCharArray.length; i += 2) {
      let tmpHex: string = '';

      tmpHex = hmacDigestCharArray[i] + hmacDigestCharArray[i + 1];

      hmacDigestHexArray.push(tmpHex);
    }

    const hmacDigestBinaryArray: string[] = [];
    for (let i = 0; i < hmacDigestHexArray.length; i++) {
      hmacDigestBinaryArray.push(
        parseInt(hmacDigestHexArray[i], 16).toString(2).padStart(8, '0'),
      );
    }

    const offset = parseInt(hmacDigestBinaryArray[19].slice(4), 2);

    let interceptedBits: string = '';
    for (let i = offset; i < offset + 4; i++) {
      interceptedBits += hmacDigestBinaryArray[i];
    }

    const slicedInterceptedBits = interceptedBits.slice(0, 31);

    const passwordAsNumber = parseInt(slicedInterceptedBits, 2) % 10 ** 6;
    const passwordAsStringArray = passwordAsNumber.toString().split('');
    const passwordAsNumberArray = passwordAsStringArray.map(Number);

    if (passwordAsNumber.toString().length < 6) {
      const digit = passwordAsNumber % 10;

      const newPasswordAsNumber = passwordAsNumber * 10 + digit;
      const newPasswordAsStringArray = passwordAsNumber.toString().split('');
      const newPasswordAsNumberArray = passwordAsStringArray.map(Number);

      console.log(
        req.body.twoFaSecret,
        req.body.twoFaUnixT0,
        passwordAsNumber,
        currentTimeStep,
      );

      if (req.body.asArrayOfDigits) {
        res.status(201).json({
          password: newPasswordAsNumberArray,
        });
        return;
      }

      res.status(201).json({
        password: newPasswordAsNumber,
      });
      return;
    }

    if (req.body.asArrayOfDigits) {
      res.status(201).json({
        password: passwordAsNumberArray,
      });
      return;
    }

    res.status(201).json({
      password: passwordAsNumber,
    });
    return;
  }

  res.status(401).json({
    errors: [
      {
        message: 'Unauthorized',
      },
    ],
  });
});
