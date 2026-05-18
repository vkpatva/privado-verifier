import express, { Express, Request, Response } from 'express';
import { auth, resolver, protocol } from '@iden3/js-iden3-auth';
import getRawBody from 'raw-body';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const app: Express = express();
const port = process.env.VERIFIER_BACKEND_PORT;
const verificationMap = new Map<string, { token?: string, status: 'pending' | 'completed' | 'failed' | 'inprogress', result?: any }>();
app.get("/api/sign-in", (req, res) => {
    console.log("get Auth Request");
    getAuthRequest(req, res);
});

app.post("/api/callback", (req, res) => {
    console.log("callback");
    callback(req, res);
});


app.get("/api/verificationstatus/:id", (req, res) => {
    getVerificationStatus(req, res)
})
app.listen(port, () => {
    console.log(`server running on port ${process.env.VERIFIER_BACKEND_PORT}`);
});

const requestMap = new Map();
const shortUrlMap = new Map<string, any>();

async function getAuthRequest(req: Request, res: Response) {
    const hostUrl = process.env.VERIFIER_BACKEND_HOST;
    const sessionId = uuidv4();  // Generate a unique UUID for the session
    const callbackURL = "/api/callback";
    const audience =
        process.env.VERIFIER_BACKEN_AMOY_SENDER_DID;

    const uri = `${hostUrl}${callbackURL}?sessionId=${sessionId}`;

    const request = auth.createAuthorizationRequest("test flow", audience as string, uri);

    const requestId = uuidv4();
    const requestThid = uuidv4();
    request.id = requestId;
    request.thid = requestThid;
    const verificationId = uuidv4();
    verificationMap.set(verificationId, { status: 'pending' });
    const proofRequest = {
        "circuitId": "credentialAtomicQuerySigV2",
        "id": 1736569127,
        "query": {
            "groupId": 1,
            "allowedIssuers": [
                "*"
            ],
            "context": "https://raw.githubusercontent.com/vkpatva/jsonschema/refs/heads/main/testing-file.json",
            "type": "testingschema",
            "credentialSubject": {
                "attribute.height": {
                    "$ne": 1
                }
            }
        }
    }
    // const proofRequest2 = {
    //     "circuitId": "credentialAtomicQuerySigV2",
    //     "id": 1736569127,
    //     "query": {
    //         "groupId": 1,
    //         "allowedIssuers": [
    //             "*"
    //         ],
    //         "context": "https://raw.githubusercontent.com/vkpatva/jsonschema/refs/heads/main/testing-file.json",
    //         "type": "testingschema",
    //         "credentialSubject": {
    //             "attribute.height": {}
    //         }
    //     }
    // }

    // const proofRequest3 = {
    //     "circuitId": "credentialAtomicQuerySigV2",
    //     "id": 1736585732,
    //     "query": {
    //         "groupId": 2,
    //       "allowedIssuers": [
    //         "*"
    //       ],
    //       "context": "https://raw.githubusercontent.com/vkpatva/jsonschema/refs/heads/main/result-json-ld.json",
    //       "type": "Result",
    //       "credentialSubject": {
    //         "marks.IT443.practical": {}
    //       }
    //     }
    //   }
      const proofRequest4 = {
        "circuitId": "credentialAtomicQuerySigV2",
        "id": 1736585732,
        "query": {
            "groupId": 2,
          "allowedIssuers": [
            "*"
          ],
          "context": "https://raw.githubusercontent.com/vkpatva/jsonschema/refs/heads/main/result-json-ld.json",
          "type": "Result",
          "credentialSubject": {
            "marks.IT443.theory": {
                "$ne": 1
            }
          }
        }
      }
    // const proofRequest = {
    //     "circuitId": "credentialAtomicQuerySigV2",
    //     "id": 1734928742,
    //     "query": {
    //         "allowedIssuers": [
    //             "*"
    //         ],
    //         "context": "https://raw.githubusercontent.com/vkpatva/jsonschema/refs/heads/main/testing-file.json",
    //         "type": "testingschema",
    //         "groupId": 1,
    //         "credentialSubject": {
    //             "attribute.place_of_birth.city": {}
    //         }
    //     }
    // }

    // const proofRequest2 = {
    //     "circuitId": "credentialAtomicQuerySigV2",
    //     "id": 1734928742,
    //     "query": {
    //         "allowedIssuers": [
    //             "*"
    //         ],
    //         "context": "https://raw.githubusercontent.com/vkpatva/jsonschema/refs/heads/main/testing-file.json",
    //         "type": "testingschema",
    //         "groupId": 1,
    //         "credentialSubject": {
    //             "attribute.place_of_birth.state": {}
    //         }
    //     }
    // }

    const scope = request.body.scope ?? [];
    request.body.scope = [...scope, proofRequest, proofRequest4];

    requestMap.set(sessionId, { ...request, verificationId: verificationId });

    const base64Message = btoa(JSON.stringify(request));

    const shortId = crypto.randomBytes(8).toString('hex');
    const shortenedUrl = `${hostUrl}/requestjson/${shortId}`;
    shortUrlMap.set(shortId, request);

    const response = {
        request: request,
        encodedURI: `iden3comm://?i_m=${base64Message}`,
        shortenURL: `iden3comm://?request_uri=${shortenedUrl}`,
        verificationId: verificationId,
        statusUrl: `${hostUrl}/api/verificationstatus/${verificationId}`
    }
    return res.status(200).set("Content-Type", "application/json").send(response);
}

async function callback(req: Request, res: Response) {
    try {

        const sessionId = req.query.sessionId;

        const raw = await getRawBody(req);
        const tokenStr = raw.toString().trim();
        console.log(tokenStr)

        const authRequest = requestMap.get(`${sessionId}`);
        console.log("\n\n\n");
        console.log("authRequest", authRequest)
        console.log("\n\n\n");
        const verificationId = authRequest.verificationId;
        console.log("verificationId", verificationId)
        verificationMap.set(verificationId, {
            status: 'inprogress',
            token: tokenStr
        });
        try {
            console.log("calling jwz validator")
            //todo : validate the token
            verificationMap.set(verificationId, {
                status: 'completed',
                token: tokenStr,
            });


        } catch (error) {
            console.log("calling jwz validator failed")
            // Update verification status if validation fails
            verificationMap.set(verificationId, {
                status: 'failed',
                token: tokenStr,
                result: { error: 'Token validation failed' }
            });
            console.error('Token validation error:', error);
            return res
                .status(200)
                .set("Content-Type", "application/json")
                .send("Your proof is being verified");
        }

        return res
            .status(200)
            .set("Content-Type", "application/json")
            .send({});
        // const ethURL = "https://rpc-mainnet.privado.id";
        // const ethURL = process.env.VERIFIER_BACKEND_AMOY_RPC;
        // const contractAddress = "0x1a4cC30f2aA0377b0c3bc9848766D90cb4404124";
        // const contractAddress = '0x3C9acB2205Aa72A05F6D77d708b5Cf85FCa3a896'
        // const keyDIR = "../keys";

        // const AMOY_STATE_RESOLVER = new resolver.EthStateResolver(
        //     ethURL as string,
        //     contractAddress
        // );

        // const resolvers = {
        //     ["polygon:amoy"]: AMOY_STATE_RESOLVER,
        //     ["privado:main"]: new resolver.EthStateResolver(
        //         "https://rpc-mainnet.privado.id",
        //         "0x975556428F077dB5877Ea2474D783D6C69233742",
        //     ),
        //     ["privado:test"]: new resolver.EthStateResolver(
        //         "https://rpc-testnet.privado.id/",
        //         "0x975556428F077dB5877Ea2474D783D6C69233742",
        //     ),
        // };

        // const verifier = await auth.Verifier.newVerifier({
        //     stateResolver: resolvers,
        //     circuitsDir: path.join(__dirname, keyDIR),
        //     ipfsGatewayURL: "https://ipfs.io",
        // });

        // try {
        //     const opts = {
        //         acceptedStateTransitionDelay: 5 * 60 * 1000, // 5 minute
        //     };
        //     const authResponse = await verifier.fullVerify(tokenStr, authRequest, opts);

        //     verificationMap.set(verificationId, {
        //         status: 'completed',
        //         token: tokenStr,
        //         result: authResponse
        //     });

        //     return res
        //         .status(200)
        //         .set("Content-Type", "application/json")
        //         .send({});

        // } catch (error) {
        //     return res.status(500).send(error);
        // }
    } catch (err) {
        console.log('inside error block')
        console.log(err)
        res.status(500).send({ error: "internal server error" })
    }
}

export const getVerificationStatus = async (req: Request, res: Response): Promise<void> => {
    console.log("getVerificationStatus")
    const verificationId = req.params.id;
    console.log(verificationId)
    const verification = verificationMap.get(verificationId);
    console.log(verification)
    if (!verification) {
        res.status(404).send({ error: "Verification not found" });
        return;
    }

    res.status(200).json({
        status: verification.status,
        result: verification.result,
        token: verification.token
    });
};
app.get("/requestjson/:shortId", (req, res) => {
    const shortId = req.params.shortId;
    const request = shortUrlMap.get(shortId);

    if (request) {
        res.json(request);
    } else {
        res.status(404).send("Short URL not found");
    }
});

