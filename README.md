PackWeb
=======

This is a collection of CLI tools designed to help with applications which are
webs of interrelated NPM packages. Features currently include:

* show NPM owners for all packages and compare with lists of desired owners
* automatically bring NPM ownership into line with what is desired

## Install:

```
npm install -g packweb
```

## Use:

First of all we have to define a configuration file which specifies which NPM
modules we're interested in performing all our operations on. This should be
a JSON file with two keys: `packages` and `owners`. At the minimum, these are
simple arrays of package names and NPM usernames, e.g.:

```json
{
    "packages": ["foo", "bar", "baz"],
    "owners": ["alice", "bob", "charlotte"]
}
```

We can pass in this data to `packweb` as a command-line JSON string, a path to
a JSON file, or a URL for a JSON file (say if you want to keep it in a GitHub
repo). The simplest thing to do is simply `--show` ownership status:

```
packweb --show --config ./packweb.json
```

This will output a color-coded report that tells you how the ownership status
of the packages in your list differs from what's desired. If you want, you can
automatically update the ownership status (assuming you are yourself an owner
of all the packages being managed by packweb):

```
packweb --update --config ./packweb.json
```

You might be thinking that your project is a bit more variegated: you have some packages which should have some owners, and some packages which should have all owners, and yet others which should have even a different set of owners. That's easy to do by making your `packages` and `owners` keys a hash of "groups" instead! Take a look at this example `packweb.json`:

```json
{
    "packages": {
        "coredevs": ["foo", "bar"],
        "contractors": ["bar"],
        "admins": ["foo", "bar", "baz"]
    },
    "owners": {
        "coredevs": ["alice", "bob"],
        "contractors": ["charlotte"],
        "admins": ["doug", "erin"]
    }
}
```

You can get as complicated as you like with groups in this way. The only rule
you have to follow is making sure the group names are the same for both
`packages` and `owners`!

For a complicated `packweb.json` example, see [Appium's
packweb.json](https://github.com/appium/appium/blob/master/packweb.json).

## Hack on Packweb

```
# transpile and run tests on every change
gulp

# transpile and run tests once
gulp once
```
