import { gql } from '@apollo/client';

export const SCHEDULE_UPDATED = gql`
  subscription ScheduleUpdated($locationId: ID!) {
    scheduleUpdated(locationId: $locationId) {
      type
      shiftId
      locationId
      shift {
        id
        locationId
        startTime
        endTime
        requiredSkill
        headcount
        status
        assignments {
          id
          userId
          status
          user {
            id
            firstName
            lastName
            skills
          }
        }
      }
    }
  }
`;

export const NEW_NOTIFICATION = gql`
  subscription NewNotification {
    newNotification {
      id
      userId
      type
      title
      message
      data
      isRead
      createdAt
    }
  }
`;
