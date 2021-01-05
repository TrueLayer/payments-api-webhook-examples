using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Jose;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace TrueLayer.Payments.WebhookExample
{
    [ApiController]
    public sealed class WebhookController : ControllerBase
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly Uri _expectedJwksUri;

        public WebhookController(
            IHttpClientFactory httpClientFactory,
            // Change host for sandbox
            string expectedJwksUri = "https://pay-api.truelayer.com/.well-known/jwks.json")
        {
            _httpClientFactory = httpClientFactory;
            _expectedJwksUri = new Uri(expectedJwksUri);
        }

        [Route("events")]
        public async Task<StatusCodeResult> OnWebhook(
            [FromBody] JObject webhookBody,
            [FromHeader(Name = "X-TL-Signature")] string jws)
        {
            var payload = webhookBody.ToString(Formatting.None);
            var verified = await VerifySignatureAsync(jws, payload);
            return StatusCode(verified ? StatusCodes.Status202Accepted : StatusCodes.Status401Unauthorized);
        }

        private async Task<bool> VerifySignatureAsync(string jws, string payload)
        {
            var jwsElements = jws.Split(".");
            var joseHeaderBase64 = jwsElements[0];
            var signatureBase64 = jwsElements[2];
            var signature = Base64Url.Decode(signatureBase64);

            var joseHeaderBytes = Base64Url.Decode(joseHeaderBase64);
            var joseHeaderString = Encoding.UTF8.GetString(joseHeaderBytes);
            var joseHeader = JsonConvert.DeserializeObject<JoseHeader>(joseHeaderString);

            if (!Uri.TryCreate(joseHeader.JsonWebKeySetUri, UriKind.Absolute, out var jwksUri)
                || jwksUri != _expectedJwksUri)
            {
                return false;
            }

            using var httpClient = _httpClientFactory.CreateClient();
            var jwksResponse = await httpClient.GetAsync(_expectedJwksUri);
            var jwksString = await jwksResponse.Content.ReadAsStringAsync();
            var jwks = JsonConvert.DeserializeObject<JsonWebKeySet>(jwksString);
            var key = jwks.Keys.Single(s => s.KeyId == joseHeader.KeyId);

            var rsaPublicKey = new RSACryptoServiceProvider();
            rsaPublicKey.ImportParameters(
                new RSAParameters {Modulus = Base64Url.Decode(key.Modulus), Exponent = Base64Url.Decode(key.Exponent)});

            var payloadBase64 = Base64Url.Encode(Encoding.UTF8.GetBytes(payload));
            var securedInput = $"{joseHeaderBase64}.{payloadBase64}";

            var jwtSettings = new JwtSettings();
            var jwsAlgorithmValue = jwtSettings.JwsAlgorithmFromHeader(joseHeader.Algorithm);
            var jwsAlgorithm = jwtSettings.Jws(jwsAlgorithmValue);

            return jwsAlgorithm.Verify(signature, Encoding.UTF8.GetBytes(securedInput), rsaPublicKey);
        }

        private sealed class JoseHeader
        {
            [JsonProperty("alg")] public string Algorithm { get; set; } = null!;
            [JsonProperty("kid")] public string KeyId { get; set; } = null!;
            [JsonProperty("jku")] public string JsonWebKeySetUri { get; set; } = null!;
            [JsonProperty("iat")] public int IssuedAt { get; set; }
        }

        private sealed class JsonWebKeySet
        {
            [JsonProperty("keys")] public IEnumerable<JsonWebKey> Keys { get; set; } = null!;
        }

        private sealed class JsonWebKey
        {
            [JsonProperty("kty")] public string KeyType { get; set; } = null!;
            [JsonProperty("e")] public string Exponent { get; set; } = null!;
            [JsonProperty("kid")] public string KeyId { get; set; } = null!;
            [JsonProperty("alg")] public string Algorithm { get; set; } = null!;
            [JsonProperty("n")] public string Modulus { get; set; } = null!;
            [JsonProperty("x5c")] public IEnumerable<string> X509CertificateChain { get; set; } = null!;
        }
    }
}
