export function parseCSV(csv) {
	const [headers, ...data] = csv.split('\n').map(str => str.trim().split(','));

	return data.map((row => Object.fromEntries(
		Array.from(row, (val, i) => [headers[i], val])
	)));
}


export function parseDateComponents({ acq_date, acq_time, ...rest }) {
	const timeStr = acq_time.padStart(4, '0');
	const dateTime = new Date(`${acq_date}T${timeStr[0]}${timeStr[1]}:${timeStr[2]}${timeStr[3]}:00.0Z`).toISOString();
	return { ...rest, dateTime };
}


export function parseFIRMS(csv) {
	return parseCSV(csv).map(parseDateComponents);
}
