const net = require('node:net')
const { once } = require('node:events')
const osc = require('osc')

jest.mock('@companion-module/base', () => ({
	...jest.requireActual('@companion-module/base'),
	InstanceBase: class {},
	runEntrypoint: jest.fn(),
}))
require('./main')
const ModuleInstance = require('@companion-module/base').runEntrypoint.mock.calls[0][0]

describe.each([false, true])('OSC TCP transport with SLIP=%s', (useSlip) => {
	test('sends a command and receives console feedback over a real TCP socket', async () => {
		const server = net.createServer()
		server.listen(0, '127.0.0.1')
		await once(server, 'listening')
		const instance = new ModuleInstance()
		instance.config = { use_slip: useSlip }
		const client = instance.getOsc10Socket('127.0.0.1', server.address().port)
		let peer
		let socket
		try {
			const accepted = once(server, 'connection')
			const ready = once(client, 'ready')
			client.open()
			;[socket] = await accepted
			peer = new osc.TCPSocketPort({ socket, useSLIP: useSlip, metadata: true })
			await ready
			const command = once(peer, 'message')
			client.send({ address: '/eos/cue/1/2/fire', args: [] })
			expect((await command)[0]).toMatchObject({ address: '/eos/cue/1/2/fire', args: [] })
			const feedback = once(client, 'message')
			peer.send({ address: '/eos/out/active/cue/text', args: [{ type: 's', value: '1/2 Test 3.0' }] })
			expect((await feedback)[0]).toMatchObject({
				address: '/eos/out/active/cue/text',
				args: [{ type: 's', value: '1/2 Test 3.0' }],
			})
		} finally {
			client.close()
			if (socket) socket.destroy()
			await new Promise((resolve) => server.close(resolve))
		}
	})
})
