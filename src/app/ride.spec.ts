import {
  LatLngTuple, bearingDegrees, cumulativeDistances, distanceMeters, fareFor, formatDuration, positionAlong, simulationMillis,
} from './ride';

describe('ride helpers', () => {
  const path: LatLngTuple[] = [[44, 21], [44.01, 21], [44.02, 21]];
  const totals = cumulativeDistances(path);

  it('prices a ride per kilometre of road', () => {
    expect(fareFor(3.2)).toBe(1280);
  });

  it('measures distance between coordinates', () => {
    expect(distanceMeters([44, 21], [45, 21])).toBeCloseTo(111195, -2);
  });

  it('reports compass bearings', () => {
    expect(bearingDegrees([44, 21], [45, 21])).toBeCloseTo(0, 5);
    expect(bearingDegrees([45, 21], [44, 21])).toBeCloseTo(180, 5);
  });

  it('finds the position part way along a path', () => {
    const middle = positionAlong(path, totals, 0.5);
    expect(middle.point[0]).toBeCloseTo(44.01, 5);
    const quarter = positionAlong(path, totals, 0.25);
    expect(quarter.point[0]).toBeCloseTo(44.005, 5);
    expect(quarter.segment).toBe(0);
  });

  it('clamps progress to the ends of the path', () => {
    expect(positionAlong(path, totals, -1).point).toEqual(path[0]);
    expect(positionAlong(path, totals, 2).point).toEqual(path[2]);
  });

  it('keeps the simulation watchable', () => {
    expect(simulationMillis(1)).toBe(12000);
    expect(simulationMillis(20)).toBe(30000);
    expect(simulationMillis(600)).toBe(45000);
  });

  it('formats durations', () => {
    expect(formatDuration(0.2)).toBe('1 min');
    expect(formatDuration(12.4)).toBe('12 min');
    expect(formatDuration(125)).toBe('2 h 5 min');
  });
});
