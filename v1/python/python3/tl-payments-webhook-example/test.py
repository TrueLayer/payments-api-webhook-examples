import unittest
from app import app
from sanic.testing import SanicTestClient


TEST_SIGNATURE = r'eyJhbGciOiJSUzI1NiIsImprdSI6Imh0dHBzOi8vcGF5LWFwaS50cnVlbGF5ZXIuY29tLy53ZWxsLWtub3duL2p3a3MuanNvbiIsImtpZCI6IjdkMDAwMjgzLTE2OWYtNGI5YS04MzYwLWQyOGIwNjYxNWU4NyJ9..XRTAhcQGUR8Gb1zW6NcnWtcdNzxgOz7ErFMxeXFfDYQAEEdvJ-RVU9lNI6kpTGHIcps2fvplqBU--DOdHigkNXggH9KU2gD1HRs2cszC2Ixe9Z4Zy1xYCwJ3uH1sz1Lc2qXOCLUImWtytDFwCVtC7Gw48P3JMCZ8xrTTvnvmid-96CnIBE0By4mj6tptgk4HSRTF8fmxDvfwfFRCI1d5Oz-hIHPH9AYvfNdK_DKPgMSxCvt4M2uT-GBN7GrTQ8N_acP9Azxqa-_T1z8bFRKTKSNS9xXrCTmLNVzsu50DoD4SgB1JDYwNwqv8eGjMhQ5c0VFk_kydVO-4OhgZNt9jBA'
TEST_TIMESTAMP = '2021-01-04T17:32:57Z'
TEST_BODY = b'{"event_type":"single_immediate_payment_status_changed","event_body":{"single_immediate_payment_id":"e0e1ace9-7273-49af-bbfa-e31ba3a611b8","status":"new"}}'


class TestSignature(unittest.TestCase):
    def test_signature(self):
        client = SanicTestClient(app, port=None)
        response = client.post(
            '/events',
            gather_request=False,
            headers={
                'X-TL-Signature': TEST_SIGNATURE,
                'X-TL-Webhook-Timestamp': TEST_TIMESTAMP,
            },
            data=TEST_BODY,
        )
        self.assertEqual(202, response.status)


if __name__ == '__main__':
    unittest.main()
