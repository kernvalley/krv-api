import { NOT_FOUND, NOT_IMPLEMENTED } from '@shgysk8zer0/consts/status';
import { createHandler } from '@shgysk8zer0/lambda-http/handler';
import { HTTPError } from '@shgysk8zer0/lambda-http/error';

async function handler() {
	throw new HTTPError('Not yet implemented.', NOT_IMPLEMENTED);
}

export default createHandler({
	async get(req) {
		const { searchParams } = new URL(req.url);
		if (! searchParams.has('type')) {
			return Response.redirect('https://maps.kernvalley.us/places/all.json');
		} else {
			switch(searchParams.get('type').toLowerCase()) {
				case 'all':
					return Response.redirect('https://maps.kernvalley.us/places/all.json');

				case 'activities':
					return Response.redirect('https://maps.kernvalley.us/places/activities.json');

				case 'bars':
					return Response.redirect('https://maps.kernvalley.us/places/bars.json');

				case 'businesses':
					return Response.redirect('https://maps.kernvalley.us/places/businesses.json');

				case 'cafes':
					return Response.redirect('https://maps.kernvalley.us/places/cafes.json');

				case 'campgrounds':
					return Response.redirect('https://maps.kernvalley.us/places/campgrounds.json');

				case 'churches':
					return Response.redirect('https://maps.kernvalley.us/places/churches.json');

				case 'civic':
					return Response.redirect('https://maps.kernvalley.us/places/civic.json');

				case 'financial':
					return Response.redirect('https://maps.kernvalley.us/places/financial.json');

				case 'gas':
					return Response.redirect('https://maps.kernvalley.us/places/gas.json');

				case 'landmarks':
					return Response.redirect('https://maps.kernvalley.us/places/landmarks.json');

				case 'lodging':
					return Response.redirect('https://maps.kernvalley.us/places/lodging.json');

				case 'restaurants':
					return Response.redirect('https://maps.kernvalley.us/places/restaurants.json');

				case 'schools':
					return Response.redirect('https://maps.kernvalley.us/places/schools.json');

				case 'stores':
					return Response.redirect('https://maps.kernvalley.us/places/stores.json');

				default:
					throw new HTTPError(`No results for ${searchParams.get('type')}`, NOT_FOUND);
			}
		}
	},
	post: handler,
	delete: handler,
}, {
	allowCredentials: true,
	allowOrigins: ['*'],
	allowHeaders: ['Authorization'],
});

