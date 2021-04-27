const Router = require('@koa/router');
const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const base64Url = require('base64url');
const jwkToPem = require('jwk-to-pem');
const jws = require('jws');
const fetch = require('node-fetch');

const app = new Koa();
const router = new Router();

const expectedJwksUri = 'https://pay-api.truelayer.com/.well-known/jwks.json';

const splitSignature = (signature) => signature.split('.');

const getJwsHeaders = (signature) => {
  const parts = splitSignature(signature);
  return JSON.parse(base64Url.decode(parts[0]));
}

const verifyDetachedSignatureAsync = async (signature, payload) => {
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
  const jwks = await jwksResponse.json();

  const key = jwks.keys.find(x => x.kid === jwsHeaders.kid);

  const rsaPublicKey = jwkToPem({
    kty: 'RSA',
    n: key.n,
    e: key.e
  });

  return jws.verify(fullSignature, jwsHeaders.alg, rsaPublicKey);
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
