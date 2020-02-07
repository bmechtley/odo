import numpy as np
import matplotlib.pyplot as pp
import sys
import scipy.signal as sig

rssis = np.genfromtxt(sys.argv[1])
#median = sig.medfilt(rssis, kernel_size=331)

#pp.hist(rssis, bins=int(np.ptp(rssis)))
#pp.show()
pp.plot(rssis)
#pp.plot(median)
pp.show()
