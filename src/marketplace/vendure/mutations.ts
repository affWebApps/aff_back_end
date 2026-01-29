import { gql } from 'graphql-request';

export const LoginMutation = gql`
    mutation Login($username: String!, $password: String!) {
        login(username: $username, password: $password) {
            __typename
            ... on CurrentUser {
                id
                identifier
            }
            ... on ErrorResult {
                errorCode
                message
            }
        }
    }
`;

export const AddToCartMutation = gql`
    mutation AddToCart($variantId: ID!, $quantity: Int!) {
        addItemToOrder(productVariantId: $variantId, quantity: $quantity) {
            __typename
            ... on Order {
                id
                code
                totalQuantity
                lines {
                    id
                    productVariant {
                        id
                        name
                    }
                    quantity
                }
            }
            ... on ErrorResult {
                errorCode
                message
            }
        }
    }
`;

export const RemoveFromCartMutation = gql`
    mutation RemoveFromCart($lineId: ID!) {
        removeOrderLine(orderLineId: $lineId) {
            __typename
            ... on Order {
                id
                code
                totalQuantity
            }
            ... on ErrorResult {
                errorCode
                message
            }
        }
    }
`;

export const AdjustCartItemMutation = gql`
    mutation AdjustCartItem($lineId: ID!, $quantity: Int!) {
        adjustOrderLine(orderLineId: $lineId, quantity: $quantity) {
            __typename
            ... on Order {
                id
                code
                totalQuantity
            }
            ... on ErrorResult {
                errorCode
                message
            }
        }
    }
`;

export const ApplyPromotionCodeMutation = gql`
    mutation ApplyPromotionCode($couponCode: String!) {
        applyCouponCode(couponCode: $couponCode) {
            __typename
            ... on Order {
                id
                code
                totalWithTax
                couponCodes
                discounts {
                    description
                    amountWithTax
                }
            }
            ... on ErrorResult {
                errorCode
                message
            }
        }
    }
`;

export const RemovePromotionCodeMutation = gql`
    mutation RemovePromotionCode($couponCode: String!) {
        removeCouponCode(couponCode: $couponCode) {
            id
            code
            totalWithTax
            couponCodes
            discounts {
                description
                amountWithTax
            }
        }
    }
`;

export const CreateProductMutation = gql`
  mutation CreateProduct($input: CreateProductInput!) {
    createProduct(input: $input) {
      id
      name
      slug
      customFields {
        vendorId
      }
    }
  }
`;

export const CreateProductVariantsMutation = gql`
  mutation CreateProductVariants($input: [CreateProductVariantInput!]!) {
    createProductVariants(input: $input) {
      id
      sku
      price
      stockOnHand
      customFields {
        vendorId
      }
    }
  }
`;

export const CreateCustomerAddressMutation = gql`
    mutation CreateCustomerAddress($input: CreateAddressInput!) {
        createCustomerAddress(input: $input) {
            id
            fullName
            company
            streetLine1
            streetLine2
            city
            province
            postalCode
            country {
                id
                code
                name
            }
            phoneNumber
            defaultShippingAddress
            defaultBillingAddress
        }
    }
`;

export const UpdateCustomerAddressMutation = gql`
    mutation UpdateCustomerAddress($input: UpdateAddressInput!) {
        updateCustomerAddress(input: $input) {
            id
            fullName
            company
            streetLine1
            streetLine2
            city
            province
            postalCode
            country {
                id
                code
                name
            }
            phoneNumber
            defaultShippingAddress
            defaultBillingAddress
        }
    }
`;

export const DeleteCustomerAddressMutation = gql`
    mutation DeleteCustomerAddress($id: ID!) {
        deleteCustomerAddress(id: $id) {
            success
        }
    }
`;

export const SetOrderShippingAddressMutation = gql`
    mutation SetOrderShippingAddress($input: CreateAddressInput!) {
        setOrderShippingAddress(input: $input) {
            __typename
            ... on Order {
                id
                code
                shippingAddress {
                    fullName
                    company
                    streetLine1
                    streetLine2
                    city
                    province
                    postalCode
                    country
                    phoneNumber
                }
            }
            ... on ErrorResult {
                errorCode
                message
            }
        }
    }
`;

export const SetOrderBillingAddressMutation = gql`
    mutation SetOrderBillingAddress($input: CreateAddressInput!) {
        setOrderBillingAddress(input: $input) {
            __typename
            ... on Order {
                id
                code
                billingAddress {
                    fullName
                    company
                    streetLine1
                    streetLine2
                    city
                    province
                    postalCode
                    country
                    phoneNumber
                }
            }
            ... on ErrorResult {
                errorCode
                message
            }
        }
    }
`;

export const SetOrderShippingMethodMutation = gql`
    mutation SetOrderShippingMethod($shippingMethodId: [ID!]!) {
        setOrderShippingMethod(shippingMethodId: $shippingMethodId) {
            __typename
            ... on Order {
                id
                code
                shippingWithTax
                totalWithTax
                shippingLines {
                    shippingMethod {
                        id
                        name
                        description
                    }
                    priceWithTax
                }
            }
            ... on ErrorResult {
                errorCode
                message
            }
        }
    }
`;

export const TransitionOrderToStateMutation = gql`
    mutation TransitionOrderToState($state: String!) {
        transitionOrderToState(state: $state) {
            __typename
            ... on Order {
                id
                code
                state
            }
            ... on OrderStateTransitionError {
                errorCode
                message
                transitionError
                fromState
                toState
            }
        }
    }
`;

export const AddPaymentToOrderMutation = gql`
    mutation AddPaymentToOrder($input: PaymentInput!) {
        addPaymentToOrder(input: $input) {
            __typename
            ... on Order {
                id
                code
                state
                payments {
                    id
                    method
                    amount
                    state
                }
            }
            ... on ErrorResult {
                errorCode
                message
            }
        }
    }
`;

export const RegisterCustomerAccountMutation = gql`
    mutation RegisterCustomerAccount($input: RegisterCustomerInput!) {
        registerCustomerAccount(input: $input) {
            __typename
            ... on Success {
                success
            }
            ... on ErrorResult {
                errorCode
                message
            }
        }
    }
`;

export const VerifyCustomerAccountMutation = gql`
    mutation VerifyCustomerAccount($token: String!, $password: String) {
        verifyCustomerAccount(token: $token, password: $password) {
            __typename
            ... on CurrentUser {
                id
                identifier
            }
            ... on ErrorResult {
                errorCode
                message
            }
        }
    }
`;

export const RequestPasswordResetMutation = gql`
    mutation RequestPasswordReset($emailAddress: String!) {
        requestPasswordReset(emailAddress: $emailAddress) {
            __typename
            ... on Success {
                success
            }
            ... on ErrorResult {
                errorCode
                message
            }
        }
    }
`;

export const ResetPasswordMutation = gql`
    mutation ResetPassword($token: String!, $password: String!) {
        resetPassword(token: $token, password: $password) {
            __typename
            ... on CurrentUser {
                id
                identifier
            }
            ... on ErrorResult {
                errorCode
                message
            }
        }
    }
`;

export const UpdateCustomerPasswordMutation = gql`
    mutation UpdateCustomerPassword($currentPassword: String!, $newPassword: String!) {
        updateCustomerPassword(currentPassword: $currentPassword, newPassword: $newPassword) {
            __typename
            ... on Success {
                success
            }
            ... on ErrorResult {
                errorCode
                message
            }
        }
    }
`;

export const LogoutMutation = gql`
    mutation Logout {
        logout {
            __typename
            ... on Success {
                success
            }
        }
    }
`;

export const UpdateCustomerMutation = gql`
    mutation UpdateCustomer($input: UpdateCustomerInput!) {
        updateCustomer(input: $input) {
            __typename
            id
            firstName
            lastName
            emailAddress
        }
    }
`;

export const RequestUpdateCustomerEmailAddressMutation = gql`
    mutation RequestUpdateCustomerEmailAddress($password: String!, $newEmailAddress: String!) {
        requestUpdateCustomerEmailAddress(password: $password, newEmailAddress: $newEmailAddress) {
            __typename
            ... on Success {
                success
            }
            ... on ErrorResult {
                errorCode
                message
            }
        }
    }
`;

export const UpdateCustomerEmailAddressMutation = gql`
    mutation UpdateCustomerEmailAddress($token: String!) {
        updateCustomerEmailAddress(token: $token) {
            __typename
            ... on Success {
                success
            }
            ... on ErrorResult {
                errorCode
                message
            }
        }
    }
`;

export const SetCustomerForOrderMutation = gql`
    mutation SetCustomerForOrder($input: CreateCustomerInput!) {
        setCustomerForOrder(input: $input) {
            __typename
            ... on Order {
                id
                code
                customer {
                    id
                    firstName
                    lastName
                    emailAddress
                    phoneNumber
                }
            }
            ... on AlreadyLoggedInError {
                errorCode
                message
            }
            ... on EmailAddressConflictError {
                errorCode
                message
            }
            ... on GuestCheckoutError {
                errorCode
                message
            }
            ... on NoActiveOrderError {
                errorCode
                message
            }
        }
    }
`;
