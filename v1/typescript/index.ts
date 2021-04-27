import Router from '@koa/router';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import { decode, encode } from 'base64-url';
import jwkToPem from 'jwk-to-pem';
import { Algorithm, verify } from 'jws';
import fetch from 'node-fetch';

const app = new Koa();
const router = new Router();

const expectedJwksUri: string = 'https://pay-api.truelayer.com/.well-known/jwks.json';

const splitSignature = (signature: string): string[] => signature.split('.');

const getJwsHeaders = (signature: string): JwsHeaders => {
  const parts = splitSignature(signature);
  return JSON.parse(decode(parts[0]));
}

const verifyDetachedSignatureAsync = async (signature: string, payload: any): Promise<boolean> => {
  const jwsHeaders = getJwsHeaders(signature);

  const serializedPayload = JSON.stringify(payload);
  const payloadB64 = encode(serializedPayload);

  const signatureParts = splitSignature(signature);
  const fullSignature = `${signatureParts[0]}.${payloadB64}.${signatureParts[2]}`;

  const jwksUri = jwsHeaders.jku;
  if (jwksUri !== expectedJwksUri) {
    return false;
  }

  const jwksResponse = await fetch(jwksUri);
  const jwks: Jwks = await jwksResponse.json();

  const key = jwks.keys.find(x => x.kid === jwsHeaders.kid);

  const rsaPublicKey: string = jwkToPem(<jwkToPem.JWK>{
    kty: 'RSA',
    n: key.n,
    e: key.e
  });

  return verify(fullSignature, <Algorithm>jwsHeaders.alg, rsaPublicKey);
}

router.post('events', '/events', async ctx => {
  const signature = ctx.get('X-TL-Signature');
  const payload = {
    'Content-Type': 'application/json',
    'X-TL-Webhook-Timestamp': ctx.get('X-TL-Webhook-Timestamp'),
    'body': ctx.request.body
  };
  const verified = await verifyDetachedSignatureAsync(signature, payload);
  ctx.status = verified ? 202 : 401;
});


app
  .use(bodyParser())
  .use(router.routes())
  .use(router.allowedMethods());

app.listen(8080, () => {
  console.log(`listening at http://localhost:${8080}`);
});

type Jwk = {
  kty: string,
  alg: string,
  kid: string,
  n: string,
  e: string,
  x5c: string[]
}

type Jwks = {
  keys: Jwk[];
}

type JwsHeaders = {
  alg: string,
  kid: string,
  jku: string,
}
