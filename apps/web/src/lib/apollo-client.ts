import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  split,
  ApolloLink,
} from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';

const httpLink = new HttpLink({
  uri: process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:3001/graphql',
});

const authLink = new ApolloLink((operation, forward) => {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('shiftsync_token') : null;

  operation.setContext({
    headers: {
      authorization: token ? `Bearer ${token}` : '',
    },
  });

  return forward(operation);
});

function createWsLink() {
  if (typeof window === 'undefined') return null;

  return new GraphQLWsLink(
    createClient({
      url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/graphql',
      connectionParams: () => {
        const token = localStorage.getItem('shiftsync_token');
        return {
          authorization: token ? `Bearer ${token}` : '',
        };
      },
      retryAttempts: 5,
      shouldRetry: () => true,
    })
  );
}

function createLink() {
  const authedHttpLink = authLink.concat(httpLink);
  const wsLink = createWsLink();

  if (!wsLink) return authedHttpLink;

  return split(
    ({ query }) => {
      const definition = getMainDefinition(query);
      return (
        definition.kind === 'OperationDefinition' &&
        definition.operation === 'subscription'
      );
    },
    wsLink,
    authedHttpLink
  );
}

export const apolloClient = new ApolloClient({
  link: createLink(),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          notifications: {
            merge(_existing, incoming) {
              return incoming;
            },
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
    },
  },
});
