import { gql } from '@apollo/client';

export const GET_ME = gql`
  query GetMe {
    me {
      id
      email
      firstName
      lastName
      role
      phone
      skills
      desiredWeeklyHours
      availability {
        dayOfWeek
        startTime
        endTime
        isRecurring
        isAvailable
      }
      createdAt
      updatedAt
    }
  }
`;

export const GET_USERS = gql`
  query GetUsers($role: String, $locationId: ID) {
    users(role: $role, locationId: $locationId) {
      id
      email
      firstName
      lastName
      role
      phone
      skills
      desiredWeeklyHours
      createdAt
    }
  }
`;

export const GET_USER = gql`
  query GetUser($id: ID!) {
    user(id: $id) {
      id
      email
      firstName
      lastName
      role
      phone
      skills
      desiredWeeklyHours
      availability {
        dayOfWeek
        startTime
        endTime
        isRecurring
        isAvailable
      }
      createdAt
      updatedAt
    }
  }
`;

export const GET_STAFF_BY_LOCATION = gql`
  query GetStaffByLocation($locationId: ID!) {
    staffByLocation(locationId: $locationId) {
      id
      email
      firstName
      lastName
      skills
      desiredWeeklyHours
    }
  }
`;

export const GET_LOCATIONS = gql`
  query GetLocations {
    locations {
      id
      name
      address
      timezone
      createdAt
    }
  }
`;

export const GET_LOCATION = gql`
  query GetLocation($id: ID!) {
    location(id: $id) {
      id
      name
      address
      timezone
    }
  }
`;

export const GET_WEEK_SCHEDULE = gql`
  query GetWeekSchedule($locationId: ID!, $week: DateTime!) {
    weekSchedule(locationId: $locationId, week: $week) {
      locationId
      week
      shifts {
        id
        locationId
        startTime
        endTime
        requiredSkill
        headcount
        status
        scheduleWeek
        publishedAt
        editCutoffHours
        assignments {
          id
          shiftId
          userId
          status
          assignedBy
          createdAt
        }
        createdAt
        updatedAt
      }
    }
  }
`;

export const GET_SHIFT = gql`
  query GetShift($id: ID!) {
    shift(id: $id) {
      id
      locationId
      startTime
      endTime
      requiredSkill
      headcount
      status
      scheduleWeek
      editCutoffHours
      assignments {
        id
        userId
        status
        assignedBy
        createdAt
      }
      createdAt
      updatedAt
    }
  }
`;

export const GET_SHIFT_HISTORY = gql`
  query GetShiftHistory($shiftId: ID!) {
    shiftHistory(shiftId: $shiftId) {
      id
      aggregateId
      aggregateType
      eventType
      version
      occurredAt
    }
  }
`;

export const GET_SWAP_REQUESTS = gql`
  query GetSwapRequests {
    swapRequests {
      id
      shiftId
      requesterId
      targetId
      status
      targetAccepted
      managerApproved
      managerId
      cancelReason
      expiresAt
      createdAt
      updatedAt
    }
  }
`;

export const GET_DROP_REQUESTS = gql`
  query GetDropRequests {
    dropRequests {
      id
      shiftId
      requesterId
      status
      pickedUpById
      managerId
      expiresAt
      managerNote
      createdAt
      updatedAt
    }
  }
`;

export const GET_AVAILABLE_DROPS = gql`
  query GetAvailableDrops($locationId: ID) {
    availableDrops(locationId: $locationId) {
      id
      shiftId
      requesterId
      status
      expiresAt
      createdAt
    }
  }
`;

export const GET_OVERTIME_DASHBOARD = gql`
  query GetOvertimeDashboard($week: DateTime!, $locationId: ID) {
    overtimeDashboard(week: $week, locationId: $locationId) {
      week
      locationId
      staff {
        userId
        firstName
        lastName
        totalHours
        overtimeHours
        projectedCost
        warningCount
      }
      atRiskCount
      overtimeCount
      totalProjectedCost
    }
  }
`;

export const GET_FAIRNESS_REPORT = gql`
  query GetFairnessReport($locationId: ID, $periodStart: DateTime!, $periodEnd: DateTime) {
    fairnessReport(locationId: $locationId, periodStart: $periodStart, periodEnd: $periodEnd) {
      averageHours
      fairnessScore
      standardDeviation
      staff {
        userId
        firstName
        lastName
        totalHours
        desiredHours
        premiumShifts
        delta
      }
    }
  }
`;

export const GET_ON_DUTY_NOW = gql`
  query GetOnDutyNow($locationId: ID) {
    onDutyNow(locationId: $locationId) {
      userId
      firstName
      lastName
      shiftId
      shiftStart
      shiftEnd
      locationId
      requiredSkill
    }
  }
`;

export const GET_NOTIFICATIONS = gql`
  query GetNotifications($unreadOnly: Boolean) {
    notifications(unreadOnly: $unreadOnly) {
      id
      userId
      type
      title
      message
      isRead
      createdAt
    }
  }
`;

export const GET_DOMAIN_EVENTS = gql`
  query GetDomainEvents($filter: EventFilterInput!) {
    domainEvents(filter: $filter) {
      id
      aggregateId
      aggregateType
      eventType
      version
      occurredAt
    }
  }
`;
