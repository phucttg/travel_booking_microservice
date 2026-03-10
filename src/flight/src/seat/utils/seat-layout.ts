import { SeatClass } from '@/seat/enums/seat-class.enum';
import { SeatType } from '@/seat/enums/seat-type.enum';

type CabinSection = {
  rowStart: number;
  rowEnd: number;
  seatClass: SeatClass;
  seatGroups: string[][];
};

export type SeatTemplate = {
  seatNumber: string;
  seatClass: SeatClass;
  seatType: SeatType;
};

const getNormalizedModel = (model?: string): string => model?.trim().toUpperCase() || '';

const getCabinLayoutByModel = (model: string): CabinSection[] => {
  if (['A320', 'A321', 'A20N'].includes(model)) {
    return [
      {
        rowStart: 1,
        rowEnd: 2,
        seatClass: SeatClass.BUSINESS,
        seatGroups: [['A', 'B'], ['C', 'D']]
      },
      {
        rowStart: 3,
        rowEnd: 6,
        seatClass: SeatClass.ECONOMY,
        seatGroups: [['A', 'B', 'C'], ['D', 'E', 'F']]
      }
    ];
  }

  if (model === 'B787') {
    return [
      {
        rowStart: 1,
        rowEnd: 1,
        seatClass: SeatClass.FIRST_CLASS,
        seatGroups: [['A'], ['C', 'D'], ['F']]
      },
      {
        rowStart: 2,
        rowEnd: 3,
        seatClass: SeatClass.BUSINESS,
        seatGroups: [['A'], ['C', 'D'], ['F']]
      },
      {
        rowStart: 4,
        rowEnd: 6,
        seatClass: SeatClass.ECONOMY,
        seatGroups: [['A', 'B'], ['C', 'D', 'E', 'F'], ['G', 'H']]
      }
    ];
  }

  if (model === 'A333') {
    return [
      {
        rowStart: 1,
        rowEnd: 2,
        seatClass: SeatClass.BUSINESS,
        seatGroups: [['A', 'B'], ['C', 'D'], ['E', 'F']]
      },
      {
        rowStart: 3,
        rowEnd: 5,
        seatClass: SeatClass.ECONOMY,
        seatGroups: [['A', 'B'], ['C', 'D', 'E', 'F'], ['G', 'H']]
      }
    ];
  }

  if (model === 'AT72') {
    return [
      {
        rowStart: 1,
        rowEnd: 7,
        seatClass: SeatClass.ECONOMY,
        seatGroups: [['A', 'B'], ['C', 'D']]
      }
    ];
  }

  return [
    {
      rowStart: 1,
      rowEnd: 6,
      seatClass: SeatClass.ECONOMY,
      seatGroups: [['A', 'B', 'C'], ['D', 'E', 'F']]
    }
  ];
};

const getSeatTypeByPosition = (
  seatGroups: string[][],
  groupIndex: number,
  seatIndex: number
): SeatType => {
  const group = seatGroups[groupIndex];
  const isFirstSeat = seatIndex === 0;
  const isLastSeat = seatIndex === group.length - 1;

  if (group.length === 1 && (groupIndex === 0 || groupIndex === seatGroups.length - 1)) {
    return SeatType.WINDOW;
  }

  const hasLeftAisle = groupIndex > 0 && isFirstSeat;
  const hasRightAisle = groupIndex < seatGroups.length - 1 && isLastSeat;
  if (hasLeftAisle || hasRightAisle) {
    return SeatType.AISLE;
  }

  const isWindowSeat =
    (groupIndex === 0 && isFirstSeat) || (groupIndex === seatGroups.length - 1 && isLastSeat);
  if (isWindowSeat) {
    return SeatType.WINDOW;
  }

  return SeatType.MIDDLE;
};

export const generateSeatTemplatesForModel = (aircraftModel?: string): SeatTemplate[] => {
  const normalizedModel = getNormalizedModel(aircraftModel);
  const cabinLayout = getCabinLayoutByModel(normalizedModel);
  const templates: SeatTemplate[] = [];

  for (const section of cabinLayout) {
    for (let row = section.rowStart; row <= section.rowEnd; row += 1) {
      for (let groupIndex = 0; groupIndex < section.seatGroups.length; groupIndex += 1) {
        const group = section.seatGroups[groupIndex];
        for (let seatIndex = 0; seatIndex < group.length; seatIndex += 1) {
          const seatLetter = group[seatIndex];
          const seatType = getSeatTypeByPosition(section.seatGroups, groupIndex, seatIndex);

          templates.push({
            seatNumber: `${row}${seatLetter}`,
            seatClass: section.seatClass,
            seatType
          });
        }
      }
    }
  }

  return templates;
};
