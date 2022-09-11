from .config import Config
from .processor import Processor
from .yaml_repository import YamlRepository


yaml_repo = YamlRepository()
config = Config(yaml_repo)
processor = Processor(config, yaml_repo)

processor.process()
