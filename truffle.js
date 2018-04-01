module.exports = {
  migrations_directory: "./migrations",
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*",
      gas: 4698712,
      gasPrice: 1000000
    }
  },
  solc: {
		optimizer: {
			enabled: true,
			runs: 200
		}
	}
};
