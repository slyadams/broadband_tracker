A broadband quota tracker for use with A&A ISP

To configure copy

	conf/example.json

To

	conf/tracker.json

Populate your A&A username/password. If desired change the port on which the HTTP server will run.

To run either:

	node tracker.js

Or if you want to run forever:

	forever start -p ./ -l logs/forever.log -o logs/out.log -e logs/err.log forever/tracker.json
