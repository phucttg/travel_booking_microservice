import { useMemo } from 'react';
import { SeatClass } from '@/types/enums';
import { SeatDto } from '@/types/seat.types';

type SeatMapVisualProps = {
  seats: SeatDto[];
  selectedSeatNumber?: string | null;
  onSelectSeat?: (seatNumber: string) => void;
  reservedSeats?: string[];
};

type ParsedSeat = {
  seat: SeatDto;
  row: number;
  column: string;
};

const parseSeat = (seat: SeatDto): ParsedSeat | null => {
  const match = seat.seatNumber.trim().toUpperCase().match(/^(\d+)([A-Z])$/);
  if (!match) return null;

  return {
    seat,
    row: Number(match[1]),
    column: match[2]
  };
};

const getAisleIndexes = (columns: string[]) => {
  if (columns.length <= 4) return [2];
  if (columns.length === 6) return [3];
  if (columns.length === 8) return [2, 6];
  return [] as number[];
};

export const SeatMapVisual = ({ seats, selectedSeatNumber, onSelectSeat, reservedSeats = [] }: SeatMapVisualProps) => {
  const parsedSeats = useMemo(() => seats.map(parseSeat).filter((item): item is ParsedSeat => Boolean(item)), [seats]);

  const columns = useMemo(() => {
    return [...new Set(parsedSeats.map((item) => item.column))].sort();
  }, [parsedSeats]);

  const rows = useMemo(() => {
    const rowNumbers = [...new Set(parsedSeats.map((item) => item.row))].sort((a, b) => a - b);
    const seatMap = new Map(parsedSeats.map((item) => [`${item.row}-${item.column}`, item.seat]));

    return rowNumbers.map((rowNumber) => ({
      rowNumber,
      seats: columns.map((column) => seatMap.get(`${rowNumber}-${column}`) || null)
    }));
  }, [columns, parsedSeats]);

  const reservedSet = useMemo(() => new Set(reservedSeats.map((seatNumber) => seatNumber.toUpperCase())), [reservedSeats]);
  const aisleIndexes = useMemo(() => getAisleIndexes(columns), [columns]);

  return (
    <div className="seat-map">
      <div className="seat-map__cockpit" />
      <div className="seat-map__cabin">
        {rows.map((row) => (
          <div key={row.rowNumber} className="seat-map__row">
            {row.seats.map((seat, index) => {
              const showAisle = aisleIndexes.includes(index);
              const seatNumber = seat?.seatNumber || `${row.rowNumber}${columns[index]}`;
              const isReserved = Boolean(seat?.isReserved) || reservedSet.has(seatNumber.toUpperCase());
              const isSelected = selectedSeatNumber?.toUpperCase() === seatNumber.toUpperCase();
              const isFirst = seat?.seatClass === SeatClass.FIRST_CLASS;
              const isBusiness = seat?.seatClass === SeatClass.BUSINESS;

              return (
                <div key={seatNumber} style={{ display: 'flex', gap: 4 }}>
                  {showAisle ? <span className="seat-map__aisle" /> : null}
                  {seat ? (
                    <button
                      type="button"
                      className={[
                        'seat-map__seat',
                        isReserved ? 'seat-map__seat--reserved' : 'seat-map__seat--available',
                        isSelected ? 'seat-map__seat--selected' : '',
                        isFirst ? 'seat-map__seat--first-class' : '',
                        isBusiness ? 'seat-map__seat--business' : ''
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      disabled={isReserved || !onSelectSeat}
                      onClick={() => {
                        if (!isReserved && onSelectSeat) {
                          onSelectSeat(seat.seatNumber);
                        }
                      }}
                    >
                      {seat.seatNumber}
                    </button>
                  ) : (
                    <span className="seat-map__aisle" />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="seat-map__legend">
        <div className="seat-map__legend-item">
          <span className="seat-map__legend-dot seat-map__seat--available" />
          <span>Available</span>
        </div>
        <div className="seat-map__legend-item">
          <span className="seat-map__legend-dot seat-map__seat--selected" />
          <span>Selected</span>
        </div>
        <div className="seat-map__legend-item">
          <span className="seat-map__legend-dot seat-map__seat--reserved" />
          <span>Reserved</span>
        </div>
        <div className="seat-map__legend-item">
          <span className="seat-map__legend-dot seat-map__seat--business" />
          <span>Business</span>
        </div>
        <div className="seat-map__legend-item">
          <span className="seat-map__legend-dot seat-map__seat--first-class" />
          <span>First</span>
        </div>
      </div>
    </div>
  );
};
