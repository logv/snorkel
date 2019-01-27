import pudgy

from .time import TimeView
from .dist import DistView
from .table import TableView
from .samples import SamplesView
from .area import AreaView
from .scatter import ScatterView
from .bar import BarView
from .grouped_dist import GroupedDist

pudgy.add_dirhash_alias("snorkel", TimeView)
