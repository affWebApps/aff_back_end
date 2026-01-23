import { gql } from 'graphql-request';

export const ProductCardFragment = gql`
    fragment ProductCard on SearchResult {
        productId
        productName
        slug
        productAsset {
            id
            preview
        }
        priceWithTax {
            __typename
            ... on PriceRange {
                min
                max
            }
            ... on SinglePrice {
                value
            }
        }
        currencyCode
    }
`;

export const ActiveCustomerFragment = gql`
    fragment ActiveCustomer on Customer {
        id
        firstName
        lastName
        emailAddress
    }
`;
