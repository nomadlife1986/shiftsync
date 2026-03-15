import { gql } from '@apollo/client';

export const LOGIN = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      accessToken
      userId
      role
      email
      firstName
      lastName
    }
  }
`;

export const CREATE_SHIFT = gql`
  mutation CreateShift($input: CreateShiftInput!) {
    createShift(input: $input) {
      id
      locationId
      startTime
      endTime
      requiredSkill
      headcount
      status
      editCutoffHours
      createdAt
    }
  }
`;

export const UPDATE_SHIFT = gql`
  mutation UpdateShift($id: ID!, $input: UpdateShiftInput!) {
    updateShift(id: $id, input: $input) {
      id
      locationId
      startTime
      endTime
      requiredSkill
      headcount
      status
      editCutoffHours
      updatedAt
    }
  }
`;

export const DELETE_SHIFT = gql`
  mutation DeleteShift($id: ID!) {
    deleteShift(id: $id)
  }
`;

export const ASSIGN_STAFF = gql`
  mutation AssignStaff($shiftId: ID!, $userId: ID!) {
    assignStaff(shiftId: $shiftId, userId: $userId) {
      success
      assignmentId
      violations {
        type
        message
        severity
      }
      overtimeWarnings {
        type
        message
      }
      suggestions {
        userId
        firstName
        lastName
        matchScore
        warnings
      }
    }
  }
`;

export const UNASSIGN_STAFF = gql`
  mutation UnassignStaff($shiftId: ID!, $userId: ID!) {
    unassignStaff(shiftId: $shiftId, userId: $userId)
  }
`;

export const WHAT_IF_ASSIGNMENT = gql`
  mutation WhatIfAssignment($shiftId: ID!, $userId: ID!) {
    whatIfAssignment(shiftId: $shiftId, userId: $userId) {
      canAssign
      violations {
        type
        message
        severity
      }
      warnings {
        type
        message
      }
      projectedWeeklyHours
    }
  }
`;

export const PUBLISH_SHIFT = gql`
  mutation PublishShift($id: ID!) {
    publishShift(id: $id) {
      id
      status
      publishedAt
    }
  }
`;

export const PUBLISH_SCHEDULE = gql`
  mutation PublishSchedule($locationId: ID!, $week: DateTime!) {
    publishSchedule(locationId: $locationId, week: $week)
  }
`;

export const UNPUBLISH_SCHEDULE = gql`
  mutation UnpublishSchedule($locationId: ID!, $week: DateTime!) {
    unpublishSchedule(locationId: $locationId, week: $week)
  }
`;

export const REQUEST_SWAP = gql`
  mutation RequestSwap($input: RequestSwapInput!) {
    requestSwap(input: $input) {
      id
      shiftId
      requesterId
      targetId
      status
      createdAt
    }
  }
`;

export const ACCEPT_SWAP = gql`
  mutation AcceptSwap($swapId: ID!) {
    acceptSwap(swapId: $swapId) {
      id
      status
      updatedAt
    }
  }
`;

export const APPROVE_SWAP = gql`
  mutation ApproveSwap($swapId: ID!) {
    approveSwap(swapId: $swapId) {
      id
      status
      managerApproved
      updatedAt
    }
  }
`;

export const REJECT_SWAP = gql`
  mutation RejectSwap($swapId: ID!, $note: String) {
    rejectSwap(swapId: $swapId, note: $note) {
      id
      status
      updatedAt
    }
  }
`;

export const CANCEL_SWAP = gql`
  mutation CancelSwap($swapId: ID!, $reason: String) {
    cancelSwap(swapId: $swapId, reason: $reason) {
      id
      status
      updatedAt
    }
  }
`;

export const REQUEST_DROP = gql`
  mutation RequestDrop($input: RequestDropInput!) {
    requestDrop(input: $input) {
      id
      shiftId
      requesterId
      status
      expiresAt
      createdAt
    }
  }
`;

export const PICKUP_DROP = gql`
  mutation PickupDrop($dropId: ID!) {
    pickupDrop(dropId: $dropId) {
      id
      status
      pickedUpById
      updatedAt
    }
  }
`;

export const APPROVE_DROP = gql`
  mutation ApproveDrop($dropId: ID!) {
    approveDrop(dropId: $dropId) {
      id
      status
      managerId
      updatedAt
    }
  }
`;

export const REJECT_DROP = gql`
  mutation RejectDrop($dropId: ID!) {
    rejectDrop(dropId: $dropId) {
      id
      status
      updatedAt
    }
  }
`;

export const CANCEL_DROP = gql`
  mutation CancelDrop($dropId: ID!) {
    cancelDrop(dropId: $dropId) {
      id
      status
      updatedAt
    }
  }
`;

export const MARK_NOTIFICATION_READ = gql`
  mutation MarkNotificationRead($id: ID!) {
    markNotificationRead(id: $id) {
      id
      isRead
    }
  }
`;

export const MARK_ALL_READ = gql`
  mutation MarkAllNotificationsRead {
    markAllNotificationsRead
  }
`;

export const CREATE_USER = gql`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      email
      firstName
      lastName
      role
      phone
      skills
      certifiedLocationIds
      managedLocationIds
      desiredWeeklyHours
      createdAt
    }
  }
`;

export const UPDATE_USER = gql`
  mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
    updateUser(id: $id, input: $input) {
      id
      email
      firstName
      lastName
      role
      phone
      desiredWeeklyHours
      skills
      certifiedLocationIds
      managedLocationIds
      updatedAt
    }
  }
`;

export const SET_AVAILABILITY = gql`
  mutation SetAvailability($userId: ID, $input: SetAvailabilityInput!) {
    setAvailability(userId: $userId, input: $input) {
      id
      availability {
        dayOfWeek
        startTime
        endTime
        isRecurring
        isAvailable
      }
    }
  }
`;
