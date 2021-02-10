import aiohttp
import binascii
import json
from collections import OrderedDict
from jose import jwk
from jose.utils import base64url_decode, base64url_encode
from sanic import Sanic, response
from sanic.exceptions import ServerError

app = Sanic('tl-payments-webhook-example')
# Change host for sandbox
app.config.expected_jwks_uri = 'https://pay-api.truelayer.com/.well-known/jwks.json'


class InvalidSignatureException(Exception):
    def __init__(self, msg):
        super().__init__(msg)
        self.msg = msg


# Setup HTTP client
@app.listener('before_server_start')
async def init(app, loop):
    app.aiohttp_session = aiohttp.ClientSession(loop=loop)

@app.listener('after_server_stop')
async def finish(app, loop):
    await app.aiohttp_session.close()


@app.exception(InvalidSignatureException)
async def handle_invalid_signature(request, exception):
    return response.text(exception.msg, status=401)


@app.route('/events', methods=['POST'])
async def on_webhook(request):
    jws = request.headers.get('X-TL-Signature')
    if jws is None:
        raise InvalidSignatureException('Missing X-TL-Signature header')
    timestamp = request.headers.get('X-TL-Webhook-Timestamp')
    if timestamp is None:
        raise InvalidSignatureException('Missing X-TL-Webhook-Timestamp header')
    payload = _get_payload(request.body.decode(), timestamp)
    verified = await _verify_signature(app, jws, payload)
    if not verified:
        raise InvalidSignatureException('Invalid signature')
    return response.empty(status=202)


def _get_payload(body, timestamp):
    raw_content = OrderedDict([
        ('Content-Type', 'application/json'),
        ('X-TL-Webhook-Timestamp', timestamp),
        ('body', body)
    ])
    return json.dumps(raw_content, separators=(',', ':')).encode()


async def _verify_signature(app, jws, payload):
    jws_header_b64, _, signature_b64 = jws.split('.')
    signature = base64url_decode(signature_b64.encode())
    header_str = base64url_decode(jws_header_b64.encode())
    header = json.loads(header_str)

    if header.get('jku') != app.config.expected_jwks_uri:
        return False
    response = await app.aiohttp_session.get(app.config.expected_jwks_uri)
    jwks = await response.json()
    # Get the first key with ID matching the header's
    raw_key = next(k for k in jwks['keys'] if k.get('kid') == header['kid'])
    key = jwk.construct(raw_key)
    payload_b64 = base64url_encode(payload).decode()
    secured_input = f'{jws_header_b64}.{payload_b64}'

    return key.verify(secured_input.encode(), signature)


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=8000)
