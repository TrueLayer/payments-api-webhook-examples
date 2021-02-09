import json
import unittest
from app import app
from sanic.testing import SanicTestClient


TEST_SIGNATURE = r'eyJhbGciOiJSUzI1NiIsImprdSI6Imh0dHBzOi8vcGF5LWFwaS50cnVlbGF5ZXIuY29tLy53ZWxsLWtub3duL2p3a3MuanNvbiIsImtpZCI6IjdkMDAwMjgzLTE2OWYtNGI5YS04MzYwLWQyOGIwNjYxNWU4NyIsImlhdCI6MTYwOTc4MTU5NH0..TeLygfRfisnBXjFc3yBNt0sXMOrZ8Vog1dbO_jGyfqa8qw-kACTkxfMNlXarNyBLrM1ff6HBm8QkjLbpBOP8Lfe9DkDnewef9erG8vOrD_YCJDqvKb2twQfRso3ZtUtQJ39NjXEsvfnO4lUzrqHbvIcn6tpLI1JU95293tJHQpj5Uam4onMtF4aIlJs5R_NDBFEDPr6oUiPCE75iY7_tTdeBK-E7LlL2HVdAwhgw5VV9g3sOudePFY_utcNq1qbjUuQWK6zLxWqD01eJOw6-EAKoMxsVtfV43o2gZKCoBQE9KHK26nBo63IXsl7gBrz693XifVHFLv9m_73UrONeSA'
TEST_BODY = {
    'event_type': 'single_immediate_payment_status_changed',
    'event_body': {
      'single_immediate_payment_id': '385a3a91-b190-445f-bf2a-00e7fc17239b',
      'status': 'initiated'
    }
}


class TestSignature(unittest.TestCase):
    def test_signature(self):
        client = SanicTestClient(app, port=None)
        response = client.post(
            '/events',
            gather_request=False,
            headers={'X-TL-Signature': TEST_SIGNATURE},
            data=json.dumps(TEST_BODY),
        )
        self.assertEqual(202, response.status)


if __name__ == '__main__':
    unittest.main()
