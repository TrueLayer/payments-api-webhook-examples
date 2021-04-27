import Koa from 'koa';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';
import base64Url from 'base64url';
import jwkToPem from 'jwk-to-pem';
import { Algorithm, verify } from 'jws';
import fetch from 'node-fetch';

const port = 8080;
const app = new Koa();
const router = new Router();

const expectedJwksUri: string = 'https://pay-api.truelayer.com/.well-known/jwks.json';

const splitSignature = (signature: string): string[] => signature.split('.');

const getJwsHeaders = (signature: string): JwsHeaders => {
  const parts = splitSignature(signature);
  return JSON.parse(base64Url.decode(parts[0]));
}

const verifyDetachedSignatureAsync = async (signature: string, payload: any): Promise<boolean> => {
  const jwsHeaders = getJwsHeaders(signature);

  const serializedPayload = JSON.stringify(payload);
  const payloadB64 = base64Url.encode(serializedPayload);

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
  const payload = ctx.request.body;
  const verified = await verifyDetachedSignatureAsync(signature, payload);
  ctx.status = verified ? 202 : 401;
});


app
  .use(bodyParser())
  .use(router.routes())
  .use(router.allowedMethods());

app.listen(port, () => {
  console.log(`listening at http://localhost:${port}`);
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
  iat: number
}
