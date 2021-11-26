import * as R from "https://raw.githubusercontent.com/selfrefactor/rambda/master/dist/rambda.esm.js";
import { assertOne, runQuery, unwrapOne } from "./database.ts";

type DbUser = {
  "id": string;
  "telegram_chat_id": string;
  "username"?: string;
  "first_name"?: string;
  "last_name"?: string;
  "language_code": string;
  "is_bot": boolean;
};

export type User = {
  id: string;
  telegramId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  languageCode: string;
  isBot: boolean;
};

export const findUser = (telegramId: string) =>
  runQuery<DbUser>(`SELECT id, telegram_chat_id FROM users WHERE telegram_chat_id = '${telegramId}'`)
    .then(unwrapMaybeOneUser);

export type CreateUserParams = {
  "telegramId": string;
  "username"?: string;
  "first_name"?: string;
  "last_name"?: string;
  "language_code"?: string;
  "is_bot"?: boolean;
};

export const createUser = (params: CreateUserParams) =>
  runQuery<DbUser>(`INSERT INTO users
    (telegram_chat_id, username, first_name, last_name, language_code, is_bot)
    VALUES (
      '${params.telegramId}',
      '${params.username}',
      '${params.first_name}',
      '${params.last_name}',
      '${params.language_code ?? "en"}',
      '${params.is_bot ?? false}')
    RETURNING *`)
    .then(unwrapOneUser);

export type UpdateUserParams = {
  "telegramId": string;
  "username"?: string;
  "first_name"?: string;
  "last_name"?: string;
  "language_code"?: string;
  "is_bot"?: boolean;
};

export const updateUser = (params: UpdateUserParams) =>
  runQuery<DbUser>(`UPDATE users SET
      username='${params.username}',
      first_name='${params.first_name}',
      last_name='${params.last_name}',
      language_code='${params.language_code ?? "en"}',
      is_bot='${params.is_bot ?? false}'
    WHERE telegram_chat_id='${params.telegramId}'
    RETURNING *`)
    .then(unwrapOneUser);

const toUser = (x: DbUser) => ({
  id: x.id,
  username: x.username,
  telegramId: x.telegram_chat_id,
  firstName: x.first_name,
  lastName: x.last_name,
  languageCode: x.language_code,
  isBot: x.is_bot,
} as User);

const unwrapMaybeOneUser: () => User | null = R.curry(unwrapOne)(toUser);

const unwrapOneUser: () => User = R.compose(assertOne, unwrapMaybeOneUser);
