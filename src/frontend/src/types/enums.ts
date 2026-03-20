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
  PENDING_PAYMENT = 0,
  CONFIRMED = 1,
  EXPIRED = 2,
  CANCELED = 3
}

export enum PaymentStatus {
  PENDING = 0,
  PROCESSING = 1,
  SUCCEEDED = 2,
  FAILED = 3,
  EXPIRED = 4
}

export enum RefundStatus {
  NONE = 0,
  PENDING = 1,
  SUCCEEDED = 2,
  FAILED = 3
}

export enum FakePaymentScenario {
  SUCCESS = 'SUCCESS',
  DECLINE = 'DECLINE',
  TIMEOUT = 'TIMEOUT'
}

export enum WalletTopupRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export enum WalletLedgerType {
  TOPUP_APPROVED = 'TOPUP_APPROVED',
  BOOKING_DEBIT = 'BOOKING_DEBIT',
  BOOKING_REFUND = 'BOOKING_REFUND'
}
