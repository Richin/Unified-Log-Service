const { checkAlerts } = require('../alerts');

describe('checkAlerts', () => {
    let warnSpy;

    beforeEach(() => {
        warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });
    });

    afterEach(() => {
        warnSpy.mockRestore();
    });

    it('should not log a warning if status is not an error or critical', () => {
        checkAlerts('test-index', { status: 'success', level: 'info' });
        expect(warnSpy).not.toHaveBeenCalled();
    });

    it('should log a warning if status is error', () => {
        checkAlerts('test-index', { status: 'error', level: 'info' });
        expect(warnSpy).toHaveBeenCalledTimes(2); // Two console.warn calls inside the function
    });

    it('should log a warning if level is critical', () => {
        checkAlerts('test-index', { status: 'success', level: 'critical' });
        expect(warnSpy).toHaveBeenCalledTimes(2);
    });
});
