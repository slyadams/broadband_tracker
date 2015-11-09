A broadband quota tracker for use with A&A ISP

To use:

	node tracker.js

Or if you want to run forever:

	forever start -p ./ -l logs/forever.log -o logs/out.log -e logs/err.log forever/tracker.json
