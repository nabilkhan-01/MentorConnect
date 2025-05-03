import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

(async () => {
  console.log('dr.sharma hash: ' + await hashPassword('dr.sharma'));
  console.log('prof.gupta hash: ' + await hashPassword('prof.gupta'));
  console.log('dr.reddy hash: ' + await hashPassword('dr.reddy'));
})();
