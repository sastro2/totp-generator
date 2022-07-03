import cors from 'cors';
import { config } from 'dotenv-safe';
import express from 'express';

config();

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

app.listen(process.env.PORT || 4000, () => {});

app.post('/', () => {});
