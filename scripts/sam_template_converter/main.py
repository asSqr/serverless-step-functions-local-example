from config import Config
from processor import Processor
from yaml_repository import YamlRepository
from file_repository import FileRepository


if __name__ == '__main__':
    yaml_repo = YamlRepository()
    file_repo = FileRepository()

    config = Config(yaml_repo)
    processor = Processor(config, yaml_repo, file_repo)

    processor.process()
