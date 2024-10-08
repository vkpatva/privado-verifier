# Privado ID Verifier

## Quickstart

1. Clone the repository
2. Install dependencies: `npm install`
3. Run ngrok on port 3000: `ngrok http 3000`
4. Copy `.env.example` to `.env` and set the correct environment variables:

```
VERIFIER_BACKEND_HOST=<ngrok-url-or-public-ip>
VERIFIER_BACKEND_PORT=3000
VERIFIER_BACKEND_KEY_DIR=./keys
VERIFIER_IPFS_URL=https://gateway.pinata.cloud
VERIFIER_BACKEN_AMOY_SENDER_DID=did:polygonid:polygon:amoy:2qH7TstpRRJHXNN4o49Fu9H2Qismku8hQeUxDVrjqT
VERIFIER_BACKEND_MAIN_SENDER_DID=did:polygonid:polygon:main:2q4Q7F7tM1xpwUTgWivb6TgKX3vWirsE3mqymuYjVv
VERIFIER_BACKEND_RESOLVER_SETTINGS_PATH=./resolvers_settings.yaml
VERIFIER_BACKEND_AMOY_RPC=
VERIFIER_BACKEND_MAIN_RPC=
```

Fill in `VERIFIER_BACKEND_AMOY_RPC` and `VERIFIER_BACKEND_MAIN_RPC` with your RPCs, and set `VERIFIER_BACKEND_HOST` to your ngrok URL or public IP.

5. If using Polygon mainnet, update the resolver settings in `index.ts`:

```diff
...
-const ethURL = process.env.VERIFIER_BACKEND_AMOY_RPC;
-const contractAddress = "0x1a4cC30f2aA0377b0c3bc9848766D90cb4404124";
+const ethURL = process.env.VERIFIER_BACKEND_MAIN_RPC;
+const contractAddress = "0x624ce98D2d27b20b8f8d521723Df8fC4db71D79D";
const keyDIR = "../keys";

const resolvers = {
-    ["polygon:amoy"]: ethStateResolver,
+    ["polygon:main"]: ethStateResolver,
};
...
```

6. Create a custom query using the Privado ID [query builder](https://tools.privado.id/query-builder). Replace the following `proofRequest` object in your code:

```javascript
const proofRequest = {
    "circuitId": "credentialAtomicQuerySigV2",
    "id": Date.now(),
    "query": {
        "allowedIssuers": [
            "*"
        ],
        "context": "ipfs://QmdH1Vu79p2NcZLFbHxzJnLuUHJiMZnBeT7SNpLaqK7k9X",
        "type": "POAP01",
        "credentialSubject": {
            "city": {
                "$eq": "mum"
            }
        }
    }
};
```

7. Run the development server: `npm run dev`

8. Open Postman and import the following API using this curl command:

```curl
curl --location 'http://localhost:3000/api/sign-in' \
--header 'Content-Type: application/json' \
--data ''
```

9. You should receive a sample response with a `sessionId`, `callbackUrl`, and a presentation request JSON object. For example:

```json
{
    "id": "a79144a6-4051-4b46-b041-e27d8535d89b",
    "thid": "ae34d348-84af-4329-8987-a74faba2b3fa",
    "from": "did:polygonid:polygon:amoy:2qH7TstpRRJHXNN4o49Fu9H2Qismku8hQeUxDVrjqT",
    "typ": "application/iden3comm-plain-json",
    "type": "https://iden3-communication.io/authorization/1.0/request",
    "body": {
        "reason": "test flow",
        "message": "",
        "callbackUrl": "https://cdc6-49-36-70-244.ngrok-free.app/api/callback?sessionId=89e464b8-78a1-47e1-860a-b7db9010c7a7",
        "scope": [
            {
                "circuitId": "credentialAtomicQuerySigV2",
                "id": 1728317222,
                "query": {
                    "allowedIssuers": [
                        "*"
                    ],
                    "context": "ipfs://QmdH1Vu79p2NcZLFbHxzJnLuUHJiMZnBeT7SNpLaqK7k9X",
                    "type": "POAP01",
                    "credentialSubject": {
                        "city": {
                            "$eq": "mum"
                        }
                    }
                }
            }
        ]
    }
}
```

10. Use the presentation request JSON object to fullfill a presentation request using the Polygon ID mobile wallet:
    - Generate a QR code for the JSON using any QR code generator
    - Scan the QR code using the Polygon ID mobile wallet

11. After the wallet has been authorized, it will redirect to the callback URL with a presentation response JSON object. The `callback` function in `index.ts` will verify the presentation response.
