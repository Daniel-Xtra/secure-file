type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'http';

const timezone = () => {
	return new Date().toLocaleString('en-GB', {
		timeZone: 'Africa/Lagos',
	});
};

class Logger {
	private static formatMessage(level: LogLevel, message: string, meta?: Record<string, any>) {
		return JSON.stringify({
			timestamp: timezone(),
			level,
			message,
			...(meta && { meta }),
		});
	}

	static info(message: string, meta?: Record<string, any>) {
		console.log(this.formatMessage('info', message, meta));
	}

	static warn(message: string, meta?: Record<string, any>) {
		console.warn(this.formatMessage('warn', message, meta));
	}

	static error(message: string | Error | any, meta?: Record<string, any>) {
		if (message instanceof Error) {
			console.error(this.formatMessage('error', message.message, meta));
		} else if (typeof message === 'object') {
			// If first argument is an object (metadata), use a default message
			console.error(this.formatMessage('error', 'Error occurred', message));
		} else {
			console.error(this.formatMessage('error', String(message), meta));
		}
	}

	static debug(message: string, meta?: Record<string, any>) {
		if (process.env.NODE_ENV === 'development') {
			console.debug(this.formatMessage('debug', message, meta));
		}
	}

	static http(meta: Record<string, any>) {
		console.log(this.formatMessage('http', 'HTTP Request/Response', meta));
	}
}

export default Logger;
