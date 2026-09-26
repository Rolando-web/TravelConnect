import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import FlightStatusCard from "./FlightStatusCard";
import { deriveFlightStatus } from "../../data/flightStatus";

const today = new Date().toISOString().slice(0, 10);
const future = new Date(Date.now() + 86400000 * 12).toISOString().slice(0, 10);
const past = new Date(Date.now() - 86400000 * 12).toISOString().slice(0, 10);

const flight = (date) => ({
  airline: "Philippine Airlines",
  flightNumber: "PR 102",
  departureCity: "Manila",
  arrivalCity: "Cebu",
  departureTime: "07:00",
  arrivalTime: "08:15",
  departureDate: date,
  seatNumber: "12A",
});

const booking = (overrides = {}) => ({
  id: 7,
  status: "upcoming",
  startDate: future,
  bookingFlights: [flight(future)],
  ...overrides,
});

describe("deriveFlightStatus", () => {
  it("keeps a future journey scheduled", () => {
    expect(deriveFlightStatus(booking())).toBe("scheduled");
  });

  it("marks a journey past its last flight date as completed", () => {
    expect(deriveFlightStatus(booking({ bookingFlights: [flight(past)] }))).toBe("completed");
  });

  it("flags travel on the current day as today", () => {
    expect(deriveFlightStatus(booking({ bookingFlights: [flight(today)] }))).toBe("today");
  });

  it("uses the latest segment of a multi-leg trip", () => {
    expect(deriveFlightStatus(booking({ bookingFlights: [flight(past), flight(future)] }))).toBe("scheduled");
  });

  it("falls back to itinerary dates when there are no flights", () => {
    expect(deriveFlightStatus(booking({ bookingFlights: [], endDate: past }))).toBe("completed");
  });

  it("cancelled and refunded always win", () => {
    expect(deriveFlightStatus(booking({ status: "cancelled", bookingFlights: [flight(future)] }))).toBe("cancelled");
    expect(deriveFlightStatus(booking({ status: "refunded", bookingFlights: [flight(future)] }))).toBe("cancelled");
  });

  it("backend-completed bookings stay completed even with a future date", () => {
    expect(deriveFlightStatus(booking({ status: "completed" }))).toBe("completed");
  });
});

describe("FlightStatusCard", () => {
  it("shows the flight, route, date and seat", () => {
    render(<FlightStatusCard booking={booking()} />);

    expect(screen.getByText("Flight Status")).toBeInTheDocument();
    expect(screen.getByText(/Philippine Airlines PR 102/)).toBeInTheDocument();
    expect(screen.getByText(/Manila → Cebu/)).toBeInTheDocument();
    expect(screen.getByText(future)).toBeInTheDocument();
    expect(screen.getByText("12A")).toBeInTheDocument();
    expect(screen.getByText(/1 confirmed flight/)).toBeInTheDocument();
  });

  it("shows Scheduled for an upcoming journey", () => {
    render(<FlightStatusCard booking={booking()} />);
    expect(screen.getByText("Scheduled · On Time")).toBeInTheDocument();
  });

  it("shows Traveling Today when the flight departs today", () => {
    render(<FlightStatusCard booking={booking({ bookingFlights: [flight(today)] })} />);
    expect(screen.getByText("Traveling Today")).toBeInTheDocument();
  });

  it("shows Journey Completed once the travel day passed", () => {
    render(<FlightStatusCard booking={booking({ bookingFlights: [flight(past)] })} />);
    expect(screen.getByText("Journey Completed")).toBeInTheDocument();
    expect(screen.getByText(/moved to Past Journeys/)).toBeInTheDocument();
  });

  it("shows Booking Cancelled for cancelled journeys", () => {
    render(<FlightStatusCard booking={booking({ status: "cancelled" })} />);
    expect(screen.getByText("Booking Cancelled")).toBeInTheDocument();
    expect(screen.getByText(/nothing was flown/)).toBeInTheDocument();
  });

  it("renders nothing when no booking is passed", () => {
    const { container } = render(<FlightStatusCard booking={null} />);
    expect(container.firstChild).toBeNull();
  });
});