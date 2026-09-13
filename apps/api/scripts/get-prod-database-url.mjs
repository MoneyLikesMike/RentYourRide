import { createRequire } from 'module';
import { readFileSync } from 'fs';

const require = createRequire(import.meta.url);
const dbName = process.env.NEST_DATABASE || 'rentyourride_v2';
const env = readFileSync('/home/ec2-user/ryrbs/production.env', 'utf8');
const g = (k) => ((env.match(new RegExp(k + '\\s*=\\s*([^\\n]+)'))) || [])[1]?.trim();
const user = encodeURIComponent(g('TYPEORM_USERNAME'));
const pass = encodeURIComponent(g('TYPEORM_PASSWORD'));
const host = g('TYPEORM_HOST');
console.log(`postgresql://${user}:${pass}@${host}:5432/${dbName}?sslmode=require`);
