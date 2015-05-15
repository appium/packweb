let fixtures = {};
fixtures.goodArray = {
    packages: [
      "pack1",
      "pack2",
      "pack3"
    ],
    owners: [
      "alice",
      "bob"
    ]
};
fixtures.goodObject = {
  packages: {
    group1: ["pack1", "pack2"],
    group2: ["pack3", "pack2"]
  }, owners: {
    group1: ["alice", "bob"],
    group2: ["alice", "charles"]
  }
};

fixtures.badTopLevel1 = [];
fixtures.badTopLevel2 = 'foo';
fixtures.badTopLevel3 = {
  packages: ["pack1"]
};
fixtures.badTopLevel4 = {
  owners: ["alice"]
};
fixtures.badPackages1 = {
  packages: "foo",
  owners: ["alice"]
};
fixtures.badPackages2 = {
  packages: [],
  owners: ["alice"]
};
fixtures.badPackages3 = {
  packages: {group1: "pack1"},
  owners: ["alice"]
};
fixtures.badPackages4 = {
  packages: {group1: []},
  owners: ["alice"]
};
fixtures.badOwners1 = {
  packages: ["pack1"],
  owners: []
};
fixtures.badOwners2 = {
  packages: ["pack1"],
  owners: {group1: "alice"}
};
fixtures.badGroups1 = {
  packages: {group1: ["pack1"]},
  owners: {group2: ["alice"]}
};
fixtures.badGroups2 = {
  packages: {group1: ["pack1"]},
  owners: {group2: ["alice"]}
};
fixtures.mochawait = {
  packages: ["mochawait"],
  owners: ["jlipps"]
};

export default fixtures;
