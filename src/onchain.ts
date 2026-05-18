import express, { Express, Request, Response } from "express";
import { auth, resolver, protocol } from "@iden3/js-iden3-auth";
import getRawBody from "raw-body";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import cors from "cors";
import path from "path";

const app: Express = express();

app.use(
  cors({
    origin: "https://wallet.privado.id",
    credentials: true,
  })
);
app.options("*", cors());

const port = process.env.VERIFIER_BACKEND_PORT;
const verificationMap = new Map<
  string,
  {
    token?: string;
    status: "pending" | "completed" | "failed" | "inprogress";
    result?: any;
  }
>();
app.get("/api/sign-in", (req, res) => {
  console.log("get Auth Request");
  getAuthRequest(req, res);
});

app.post("/api/callback", (req, res) => {
  console.log("callback");
  callback(req, res);
});

app.get("/api/verificationstatus/:id", (req, res) => {
  getVerificationStatus(req, res);
});
app.listen(port, () => {
  console.log(`server running on port ${process.env.VERIFIER_BACKEND_PORT}`);
});

const requestMap = new Map();
const shortUrlMap = new Map<string, any>();

async function getAuthRequest(req: Request, res: Response) {
  const hostUrl = process.env.VERIFIER_BACKEND_HOST;
  const sessionId = uuidv4(); // Generate a unique UUID for the session
  const callbackURL = "/api/callback";
  const audience = process.env.VERIFIER_BACKEN_AMOY_SENDER_DID;

  const uri = `${hostUrl}${callbackURL}?sessionId=${sessionId}`;

  // const request = auth.createAuthorizationRequest("test flow", audience as string, uri);

  const requestId = uuidv4();
  const requestThid = uuidv4();
  // request.id = "7f38a193-0918-4a48-9fac-36adfdb8b543";
  // request.thid = "7f38a193-0918-4a48-9fac-36adfdb8b543";
  const verificationId = uuidv4();
  verificationMap.set(verificationId, { status: "pending" });

  const proofRequests = [
    {
      circuitId: "credentialAtomicQueryV3OnChain-beta.1",
      id: 1759276186,
      query: {
        allowedIssuers: ["*"],
        context: "ipfs://QmcAp1AkJb7f5U53b6aQ9RAv1GwXsyG3vFDxC2pkMkQMhM",
        type: "ChatbotCredential",
      },
    },
  ];
  // }

  const transactionData = {
    chain_id: 80002,
    contract_address: "0xfcc86A79fCb057A8e55C6B853dff9479C3cf607c",
    method_id: "0xade09fcd",
    network: "polygon-amoy",
  };

  const request = {
    body: {
      reason: "for testing purposes",
      scope: proofRequests,
      transaction_data: transactionData,
    },
    from: "did:iden3:polygon:amoy:x6x5sor7zpyefHwZu9RE4xiuRWBkq9xAEHxrKbKWb",
    id: "570ac0e8-f16d-4646-8cd0-6b0d9b9510fb",
    thid: "570ac0e8-f16d-4646-8cd0-6b0d9b9510fb",
    typ: "application/iden3comm-plain-json",
    type: "https://iden3-communication.io/proofs/1.0/contract-invoke-request",
  };
  // },

  // const scope = request.body.scope ?? [];
  // request.body.scope = [...scope, proofRequest];
  // request.body.push(transactionData);

  requestMap.set(sessionId, { ...request, verificationId: verificationId });

  const base64Message = btoa(JSON.stringify(request));
  // const base64Message = Buffer.from(JSON.stringify(request));

  const shortId = crypto.randomBytes(8).toString("hex");
  const shortenedUrl = `${hostUrl}/requestjson/${shortId}`;
  shortUrlMap.set(shortId, request);

  const response = {
    request: request,
    encodedURI: `iden3comm://?i_m=${base64Message}`,
    shortenURL: `iden3comm://?request_uri=${shortenedUrl}`,
    verificationId: verificationId,
    statusUrl: `${hostUrl}/api/verificationstatus/${verificationId}`,
  };
  return res.status(200).set("Content-Type", "application/json").send(response);
}

async function callback(req: Request, res: Response) {
  try {
    const sessionId = req.query.sessionId;

    const raw = await getRawBody(req);
    const tokenStr = raw.toString().trim();
    console.log(tokenStr);

    const authRequest = requestMap.get(`${sessionId}`);
    console.log("\n\n\n");
    console.log("authRequest", authRequest);
    console.log("\n\n\n");
    const verificationId = authRequest.verificationId;
    console.log("verificationId", verificationId);
    verificationMap.set(verificationId, {
      status: "inprogress",
      token: tokenStr,
    });
    // try {
    //     console.log("calling jwz validator")
    //     //todo : validate the token
    //     verificationMap.set(verificationId, {
    //         status: 'completed',
    //         token: tokenStr,
    //     });

    // } catch (error) {
    //     console.log("calling jwz validator failed")
    //     // Update verification status if validation fails
    //     verificationMap.set(verificationId, {
    //         status: 'failed',
    //         token: tokenStr,
    //         result: { error: 'Token validation failed' }
    //     });
    //     console.error('Token validation error:', error);
    //     return res
    //         .status(200)
    //         .set("Content-Type", "application/json")
    //         .send("Your proof is being verified");
    // }

    // return res
    //     .status(200)
    //     .set("Content-Type", "application/json")
    //     .send({});
    // const ethURL = "https://rpc-mainnet.privado.id";
    const ethURL = process.env.VERIFIER_BACKEND_AMOY_RPC;
    const contractAddress = "0x1a4cC30f2aA0377b0c3bc9848766D90cb4404124";
    // const contractAddress = '0x3C9acB2205Aa72A05F6D77d708b5Cf85FCa3a896'
    const keyDIR = "../keys";

    const AMOY_STATE_RESOLVER = new resolver.EthStateResolver(
      ethURL as string,
      contractAddress
    );

    const resolvers = {
      ["polygon:amoy"]: AMOY_STATE_RESOLVER,
      // ["privado:main"]: new resolver.EthStateResolver(
      //     "https://rpc-mainnet.privado.id",
      //     "0x975556428F077dB5877Ea2474D783D6C69233742",
      // ),
      // ["privado:test"]: new resolver.EthStateResolver(
      //     "https://rpc-testnet.privado.id/",
      //     "0x975556428F077dB5877Ea2474D783D6C69233742",
      // ),
    };

    const verifier = await auth.Verifier.newVerifier({
      stateResolver: resolvers,
      circuitsDir: path.join(__dirname, keyDIR),
      ipfsGatewayURL: "https://ipfs.io",
    });

    try {
      const opts = {
        acceptedStateTransitionDelay: 5 * 60 * 1000, // 5 minute
      };
      const authResponse = await verifier.fullVerify(
        tokenStr,
        authRequest,
        opts
      );

      verificationMap.set(verificationId, {
        status: "completed",
        token: tokenStr,
        result: authResponse,
      });

      return res.status(200).set("Content-Type", "application/json").send({});
    } catch (error) {
      return res.status(500).send(error);
    }
  } catch (err) {
    console.log("inside error block");
    console.log(err);
    res.status(500).send({ error: "internal server error" });
  }
}

export const getVerificationStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  console.log("getVerificationStatus");
  const verificationId = req.params.id;
  console.log(verificationId);
  const verification = verificationMap.get(verificationId);
  console.log(verification);
  if (!verification) {
    res.status(404).send({ error: "Verification not found" });
    return;
  }

  res.status(200).json({
    status: verification.status,
    result: verification.result,
    token: verification.token,
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
