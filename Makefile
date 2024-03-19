# Echidna
echidna-bigbang:
	echidna test/invariants/TesterBigBang.t.sol --contract Tester --config ./test/invariants/_config/echidna_config.yaml --corpus-dir ./test/invariants/_corpus/echidna/default/_data/corpus

echidna-assert-bigbang:
	echidna test/invariants/TesterBigBang.t.sol --test-mode assertion --contract Tester --config ./test/invariants/_config/echidna_config.yaml --corpus-dir ./test/invariants/_corpus/echidna/default/_data/corpus

echidna-singularity:
	echidna test/invariants/TesterSingularity.t.sol --contract Tester --config ./test/invariants/_config/echidna_config.yaml --corpus-dir ./test/invariants/_corpus/echidna/default/_data/corpus

echidna-assert-singularity:
	echidna test/invariants/TesterSingularity.t.sol --test-mode assertion --contract Tester --config ./test/invariants/_config/echidna_config.yaml --corpus-dir ./test/invariants/_corpus/echidna/default/_data/corpus

# Medusa
medusa-bigbang:
	medusa fuzz --config medusa-bigbang.json

medusa-singularity:
	medusa fuzz --config medusa-singularity.json