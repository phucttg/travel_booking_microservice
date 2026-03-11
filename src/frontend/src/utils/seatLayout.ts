type CabinSection = {
  rowStart: number;
  rowEnd: number;
  seatGroups: string[][];
};

const getCabinLayoutByModel = (model: string): CabinSection[] => {
  if (['A320', 'A321', 'A20N'].includes(model)) {
    return [
      {
        rowStart: 1,
        rowEnd: 2,
        seatGroups: [['A', 'B'], ['C', 'D']]
      },
      {
        rowStart: 3,
        rowEnd: 6,
        seatGroups: [['A', 'B', 'C'], ['D', 'E', 'F']]
      }
    ];
  }

  if (model === 'B787') {
    return [
      {
        rowStart: 1,
        rowEnd: 1,
        seatGroups: [['A'], ['C', 'D'], ['F']]
      },
      {
        rowStart: 2,
        rowEnd: 3,
        seatGroups: [['A'], ['C', 'D'], ['F']]
      },
      {
        rowStart: 4,
        rowEnd: 6,
        seatGroups: [['A', 'B'], ['C', 'D', 'E', 'F'], ['G', 'H']]
      }
    ];
  }

  if (model === 'A333') {
    return [
      {
        rowStart: 1,
        rowEnd: 2,
        seatGroups: [['A', 'B'], ['C', 'D'], ['E', 'F']]
      },
      {
        rowStart: 3,
        rowEnd: 5,
        seatGroups: [['A', 'B'], ['C', 'D', 'E', 'F'], ['G', 'H']]
      }
    ];
  }

  if (model === 'AT72') {
    return [
      {
        rowStart: 1,
        rowEnd: 7,
        seatGroups: [['A', 'B'], ['C', 'D']]
      }
    ];
  }

  return [
    {
      rowStart: 1,
      rowEnd: 6,
      seatGroups: [['A', 'B', 'C'], ['D', 'E', 'F']]
    }
  ];
};

export const getExpectedSeatCountByAircraftModel = (aircraftModel?: string): number => {
  const normalizedModel = aircraftModel?.trim().toUpperCase() || '';
  const sections = getCabinLayoutByModel(normalizedModel);

  return sections.reduce((total, section) => {
    const seatPerRow = section.seatGroups.reduce((sum, group) => sum + group.length, 0);
    const rowCount = section.rowEnd - section.rowStart + 1;
    return total + seatPerRow * rowCount;
  }, 0);
};
