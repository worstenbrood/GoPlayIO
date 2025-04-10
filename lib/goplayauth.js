import { Amplify } from 'aws-amplify';
import { signIn } from "aws-amplify/auth";
import { cognitoUserPoolsTokenProvider } from 'aws-amplify/auth/cognito';
import { sharedInMemoryStorage } from "aws-amplify/utils";
import { fetchAuthSession } from 'aws-amplify/auth';

const clientId = '6s1h851s8uplco5h6mqh1jac8m';
const userPoolId = 'eu-west-1_dViSsKM5Y';
const identitypoolId = 'eu-west-1:8b7eb22c-cf61-43d5-a624-04b494867234'
const region = 'eu-west-1';

// Setup amplify
Amplify.configure({
    Auth: {
      Cognito: {
        userPoolClientId: clientId,
        userPoolId: userPoolId,
        region: region,
        identityPoolId: identitypoolId
      }
    }
});

// Set token storage
cognitoUserPoolsTokenProvider.setKeyValueStorage(sharedInMemoryStorage);

export default class GoPlayAuth {
    constructor(username, password) {
        const self = this;
        self.username = username;
        self.password = password;        
    }

    async getToken() {
        const self = this;

        // Receive existing
        let session = await fetchAuthSession({forceRefresh: true});
        if (session && session.tokens && session.tokens.idToken) {
            return session.tokens.idToken;
        }
        
        // Sign in
        const nextStep = await signIn({
            username: self.username,
            password: self.password,
        });

        // Something went wrong
        if (!nextStep.isSignedIn) {
            throw new Error('Failed to sign in.');
        }

        // Fetch session
        session = await fetchAuthSession();
        if (session && session.tokens && session.tokens.idToken) {
            return session.tokens.idToken;
        }
        
        throw Error('Failed to fetch idToken.');
    }
}