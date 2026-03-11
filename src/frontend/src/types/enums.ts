export enum Role {
  USER = 0,
  ADMIN = 1
}

export enum TokenType {
  ACCESS = 0,
  REFRESH = 1
}

export enum FlightStatus {
  UNKNOWN = 0,
  FLYING = 1,
  DELAY = 2,
  CANCELED = 3,
  COMPLETED = 4,
  SCHEDULED = 5
}

export enum SeatClass {
  UNKNOWN = 0,
  FIRST_CLASS = 1,
  BUSINESS = 2,
  ECONOMY = 3
}

export enum SeatType {
  UNKNOWN = 0,
  WINDOW = 1,
  MIDDLE = 2,
  AISLE = 3
}

export enum PassengerType {
  UNKNOWN = 0,
  MALE = 1,
  FEMALE = 2,
  BABY = 3
}

export enum BookingStatus {
  CONFIRMED = 0,
  CANCELED = 1
}
